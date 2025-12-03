// app/(tabs)/Dashboard.tsx
import { collection, getDocs } from "firebase/firestore";
import { Stack, useRouter } from "expo-router";
import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import useAuthStore from "@/store/authStore";
import { db } from "../../firebase/firebaseConfig";

interface Equipment {
  id: string;
  name: string;
  images: string[];
  rent: number;
  description?: string;
  locationDetails?: string;
}

const NUM_COLUMNS = 2;
const CARD_MARGIN = 8;
const screenWidth = Dimensions.get("window").width;
const CARD_WIDTH = screenWidth / NUM_COLUMNS - CARD_MARGIN * 3;
export const getEquipmentForBot = async (centerId: string): Promise<Equipment[]> => {
    if (!centerId) {
        return [];
    }

    try {
        const equipmentRef = collection(
            db,
            `chcCenters/${centerId}/equipment`
        );
        const snapshot = await getDocs(equipmentRef);

        const equipment: Equipment[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || "Unnamed Equipment",
                images: Array.isArray(data.images) ? data.images : [],
                rent: data.rent || 0,
                description: data.description,
                locationDetails: data.locationDetails,
            };
        });
        return equipment;
    } catch (error) {
        console.error("Failed to fetch equipment for bot:", error);
        return [];
    }
};
const EquipmentCard = React.memo(
  ({ item, router }: { item: Equipment; router: any }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push(`/equipment/${item.id}`)}
    >
      <Image
        source={{
          uri:
            item.images[0] ||
            "https://placehold.co/400x300/CCCCCC/666666?text=Equipment",
        }}
        style={styles.cardImage}
        resizeMode="cover"
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardRent}>
          <Text style={styles.rentSymbol}>₹</Text>
          {item.rent.toFixed(0)} / hr
        </Text>
      </View>
    </TouchableOpacity>
  )
);

EquipmentCard.displayName = "EquipmentCard";

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const [allEquipmentList, setAllEquipmentList] = useState<Equipment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchEquipment = async () => {
    if (!user?.centerId) {
      setIsLoading(false);
      return;
    }
 const equipment = await getEquipmentForBot(user.centerId);
    setIsLoading(true);
    try {
      const equipmentRef = collection(
        db,
        `chcCenters/${user.centerId}/equipment`
      );
      const snapshot = await getDocs(equipmentRef);

      const equipment: Equipment[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || "Unnamed Equipment",
          images: Array.isArray(data.images) ? data.images : [],
          rent: data.rent || 0,
          description: data.description,
          locationDetails: data.locationDetails,
        };
      });

      setAllEquipmentList(equipment);
    } catch (error) {
      console.error("Failed to fetch equipment:", error);
      Alert.alert(
        "Error",
        "Could not load equipment list. Please check your network."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, [user?.centerId]);

  const filteredEquipment = useMemo(() => {
    if (!searchQuery) {
      return allEquipmentList;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return allEquipmentList.filter(
      (equipment) =>
        equipment.name.toLowerCase().includes(lowerCaseQuery) ||
        equipment.description?.toLowerCase().includes(lowerCaseQuery)
    );
  }, [allEquipmentList, searchQuery]);

  return (
    <View style={styles.fullContainer}>
      <Stack.Screen
        options={{
          title: "Homepage",
          headerShown: false,
        }}
      />

      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome,{" "}
          <Text style={styles.userName}>
            {user?.name.split(" ")[0] || "User"}
          </Text>
          !
        </Text>
        <Text style={styles.centerText}>
          <Text style={styles.centerName}>{user?.centerName}</Text>
        </Text>

        <View style={styles.searchBar}>
          <IconSymbol
            name="magnifyingglass"
            size={20}
            color="#666"
            style={{ marginRight: 10 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search equipment by name or description..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <IconSymbol name="xmark.circle.fill" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color="#007E6E" />
          <Text style={styles.loadingText}>Loading equipment...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEquipment}
          renderItem={({ item }) => (
            <EquipmentCard item={item} router={router} />
          )}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.statusContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? `No equipment matching "${searchQuery}" found.`
                  : "No equipment found at this center."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: "#E7DEAF",
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 35,
    backgroundColor: "#007E6E",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "300",
    color: "#FFF",
    marginBottom: 4,
  },
  userName: {
    fontWeight: "700",
  },
  centerText: {
    fontSize: 14,
    color: "#D4E8E8",
    marginBottom: 10,
  },
  centerName: {
    fontWeight: "600",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    marginTop: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 10,
  },
  flatListContent: {
    paddingHorizontal: CARD_MARGIN,
    paddingVertical: 10,
    paddingBottom: 20,
  },
  card: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN,
    backgroundColor: "white",
    borderRadius: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  cardImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#f0f0f0",
  },
  cardContent: {
    padding: 12,
    paddingBottom: 15,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  cardRent: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "700",
  },
  rentSymbol: {
    fontSize: 14,
    fontWeight: "400",
    marginRight: 2,
  },
  statusContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 30,
    fontSize: 16,
    color: "#666",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#007E6E",
  },
});
