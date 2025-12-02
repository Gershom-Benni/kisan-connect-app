// app/equipment/[id].tsx
import { doc, getDoc } from "firebase/firestore";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";

import useAuthStore from "@/store/authStore";
import { db } from "../../firebase/firebaseConfig";

interface Equipment {
  id: string;
  name: string;
  rent: number;
  images: string[];
  description: string;
  available: boolean;
  locationDetails: string;
}

const windowHeight = Dimensions.get("window").height;

interface DetailRowProps {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
}

const DetailRow = ({ icon, label, value, highlight }: DetailRowProps) => (
  <View style={styles.detailRow}>
    <View style={styles.detailRowStart}>
      <IconSymbol
        name={icon}
        size={16}
        color="#007E6E"
        style={{ marginRight: 8 }}
      />
      <Text style={styles.label}>{label}</Text>
    </View>
    <Text style={[styles.value, highlight && styles.highlightValue]}>
      {value}
    </Text>
  </View>
);

DetailRow.displayName = "DetailRow";

export default function EquipmentDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const equipmentId = Array.isArray(id) ? id[0] : id;

  const fetchEquipmentDetails = async () => {
    if (!equipmentId || !user?.centerId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const docRef = doc(
        db,
        `chcCenters/${user.centerId}/equipment`,
        equipmentId
      );
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const imageArray = Array.isArray(data.images) ? data.images : [];

        console.log("Equipment data:", {
          id: docSnap.id,
          image: imageArray,
          hasImage: imageArray.length > 0,
          firstImage: imageArray[0],
        });

        setEquipment({
          id: docSnap.id,
          name: data.name || "Equipment",
          rent: data.rent || 0,
          images: imageArray,
          description: data.description || "No description provided.",
          available: data.available ?? true,
          locationDetails: data.locationDetails || "Unknown Location",
        });
      } else {
        Alert.alert("Error", "Equipment not found.");
      }
    } catch (error) {
      console.error("Failed to fetch equipment details:", error);
      Alert.alert(
        "Error",
        "Could not load equipment details. Please check your network."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipmentDetails();
  }, [equipmentId, user?.centerId]);

  const handleRentPress = () => {
    if (!equipment) return;
    router.push({
      pathname: "/rent/summary",
      params: {
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        equipmentRent: equipment.rent.toString(),
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007E6E" />
        <Text style={styles.loadingText}>Loading equipment details...</Text>
      </View>
    );
  }

  if (!equipment) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: "Equipment Not Found" }} />
        <Text style={styles.errorText}>
          Equipment details could not be loaded.
        </Text>
      </View>
    );
  }

  const imageUri =
    equipment.images[0] ||
    "https://placehold.co/400x300/CCCCCC/666666?text=Equipment";

  console.log("Rendering image with URI:", imageUri);

  return (
    <View style={styles.fullScreenContainer}>
      <Stack.Screen
        options={{
          title: equipment.name,
          headerStyle: { backgroundColor: "#007E6E" },
          headerTintColor: "#FFF",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageHeader}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.rentBadge}>
            <Text style={styles.rentBadgeText}>₹{equipment.rent} / hr</Text>
          </View>
        </View>

        <View style={styles.detailsBox}>
          <Text style={styles.equipmentTitle}>{equipment.name}</Text>
          <View style={styles.infoGroup}>
            <View style={styles.infoItem}>
              <IconSymbol
                name="bolt.circle.fill"
                size={20}
                color={equipment.available ? "#007E6E" : "#ff3b30"}
              />
              <Text
                style={
                  equipment.available
                    ? styles.availableText
                    : styles.unavailableText
                }
              >
                {equipment.available ? "Available Now @" : "Rented Out"}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <IconSymbol name="mappin.and.ellipse" size={20} color="#007AFF" />
              <Text style={styles.locationText}>CHC : {user?.centerId}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{equipment.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipment Details</Text>
            <DetailRow icon="barcode" label="ID" value={equipment.id} />
            <DetailRow
              icon="location.fill"
              label="Specific Location"
              value={equipment.locationDetails}
            />
            <DetailRow
              icon="tag.fill"
              label="Rent Per hr"
              value={`₹${equipment.rent}`}
              highlight
            />
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.rentButton,
            !equipment.available && styles.disabledButton,
          ]}
          onPress={handleRentPress}
          disabled={!equipment.available}
        >
          <Text style={styles.rentButtonText}>
            {equipment.available ? "Rent This Equipment" : "Not Available"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#E7DEAF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E7DEAF",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#007E6E",
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: "#ff3b30",
  },
  contentContainer: {
    paddingBottom: 0,
  },
  imageHeader: {
    width: "100%",
    height: windowHeight * 0.4,
    marginBottom: 0,
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0",
  },
  rentBadge: {
    position: "absolute",
    bottom: 20,
    right: 0,
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  rentBadgeText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  detailsBox: {
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    padding: 20,
    paddingTop: 30,
    minHeight: windowHeight * 0.6 + 30,
  },
  equipmentTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#333",
    marginBottom: 20,
  },
  infoGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  availableText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#007E6E",
  },
  unavailableText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#ff3b30",
  },
  locationText: {
    marginLeft: 8,
    fontSize: 15,
    color: "#007AFF",
    fontWeight: "600",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007E6E",
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailRowStart: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#999999",
  },
  value: {
    fontSize: 16,
    color: "#333",
  },
  highlightValue: {
    fontWeight: "700",
    color: "#007AFF",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingBottom: Platform.OS === "ios" ? 30 : 15,
  },
  rentButton: {
    width: "100%",
    padding: 15,
    backgroundColor: "#007E6E",
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  rentButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#A0A0A0",
  },
});
