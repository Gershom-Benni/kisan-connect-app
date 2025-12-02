// app/rent/summary.tsx
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { IconSymbol } from "@/components/ui/icon-symbol";
import useAuthStore from "@/store/authStore";
import { db } from "../../firebase/firebaseConfig";
const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString(); // Generates a 4-digit OTP
};
export default function RentSummaryScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const { equipmentId, equipmentName, equipmentRent } = params as {
    equipmentId?: string;
    equipmentName?: string;
    equipmentRent?: string;
  };

  const dailyRate = parseInt(equipmentRent || "0", 10);

  const [selectedHours, setSelectedHours] = useState("2");
  const [isProcessing, setIsProcessing] = useState(false);

  const estimatedCost = useMemo(() => {
    return dailyRate * parseInt(selectedHours, 10);
  }, [dailyRate, selectedHours]);

  const handleRequestSubmit = async () => {
    console.log("Debug Info:", {
      equipmentId,
      equipmentName,
      equipmentRent,
      dailyRate,
      userId: user?.uid,
      centerId: user?.centerId,
      userName: user?.name,
    });

    if (!equipmentId) {
      Alert.alert(
        "Error",
        "Equipment ID is missing. Please go back and select equipment again."
      );
      return;
    }

    if (!user?.uid) {
      Alert.alert("Error", "User not authenticated. Please log in again.");
      return;
    }

    if (!user?.centerId) {
      Alert.alert(
        "Error",
        "Center ID is missing from your profile. Please contact support."
      );
      return;
    }

    if (dailyRate === 0 || isNaN(dailyRate)) {
      Alert.alert(
        "Error",
        "Invalid equipment rate. Please go back and try again."
      );
      return;
    }

    if (isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      const ordersRef = collection(db, `chcCenters/${user.centerId}/orders`);
      const hours = parseInt(selectedHours, 10);
const deliveryOtp = generateOtp();
      const newOrder = {
        equipmentId: equipmentId,
        equipmentName: equipmentName,
        equipmentRent: dailyRate,
deliveryOtp: deliveryOtp,
        userId: user.uid,
        userName: user.name,

        bookingMode: "app",
        bookingHrs: hours,
        estimatedCost: estimatedCost,

        status: "Pending",
        chcId: user.centerId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await new Promise((resolve) => setTimeout(resolve, 500));

      await addDoc(ordersRef, newOrder);

      Alert.alert(
        "Request Submitted",
        `Your rental request for ${equipmentName} for ${hours} hours has been submitted.`
      );
      router.replace("/(tabs)/rents");
    } catch (error) {
      console.error("Order submission error:", error);
      Alert.alert(
        "Request Failed",
        "Could not submit your rental request. Please check your network."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => (i + 1).toString());

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Confirm Rental",
          headerStyle: { backgroundColor: "#007E6E" },
          headerTintColor: "#FFF",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <IconSymbol
            name="calendar.badge.plus"
            size={60}
            color="#007E6E"
            style={styles.iconStyle}
          />
          <Text style={styles.statusTitle}>Pre-Order Summary</Text>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Equipment Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Equipment:</Text>
              <Text style={styles.value}>{equipmentName || "N/A"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Daily Rate:</Text>
              <Text style={styles.valueHighlight}>₹{dailyRate} / hr</Text>
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Select Rental Hours</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedHours}
                onValueChange={(itemValue) => setSelectedHours(itemValue)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {hourOptions.map((hour) => (
                  <Picker.Item
                    key={hour}
                    label={`${hour} Hours`}
                    value={hour}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.costContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.costLabel}>Total Hours:</Text>
              <Text style={styles.costValue}>{selectedHours} hrs</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>ESTIMATED TOTAL COST:</Text>
              <Text style={styles.totalValue}>₹{estimatedCost}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.submitButton, isProcessing && styles.disabledButton]}
          onPress={handleRequestSubmit}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E7DEAF",
  },
  scrollContent: {
    padding: 20,
    alignItems: "center",
    paddingBottom: 100,
  },
  summaryCard: {
    width: "100%",
    maxWidth: 400,
    padding: 25,
    backgroundColor: "white",
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
    alignItems: "center",
  },
  iconStyle: {
    marginBottom: 15,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007E6E",
    marginBottom: 30,
  },
  sectionContainer: {
    width: "100%",
    marginBottom: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  detailRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  label: {
    fontSize: 16,
    color: "#666",
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  valueHighlight: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f9f9f9",
    height: Platform.OS === "ios" ? 150 : 50,
    justifyContent: "center",
  },
  picker: {
    width: "100%",
    ...Platform.select({
      ios: {
        height: 150,
      },
      android: {
        height: 50,
      },
    }),
  },
  pickerItem: {
    fontSize: 18,
    color: "#333",
  },
  costContainer: {
    width: "100%",
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: "#007E6E",
  },
  costLabel: {
    fontSize: 18,
    color: "#666",
    fontWeight: "500",
  },
  costValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  totalRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007E6E",
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "bold",
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
  submitButton: {
    width: "100%",
    padding: 15,
    backgroundColor: "#007E6E",
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#A0A0A0",
  },
});
