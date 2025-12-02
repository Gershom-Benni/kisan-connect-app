// app/rent/details/[id].tsx
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import useAuthStore from "@/store/authStore";
import { db } from "../../../firebase/firebaseConfig";

interface Order {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentRent: number;
  bookingHrs: number;
  bookingMode: string;
  estimatedCost: number;
  status: "Pending" | "Allocated" | "Delivered" | "Returned";
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  userName: string;
  chcId: string;
  allocatedStartTime?: Date | null;
  allocatedEndTime?: Date | null;
  deliveryOtp?: string;
}

const formatTime = (time: Date | Timestamp | null | undefined): string => {
  if (!time) return "N/A";

  let date: Date;
  if (time instanceof Timestamp) {
    date = time.toDate();
  } else if (time instanceof Date) {
    date = time;
  } else {
    return "N/A";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const orderId = Array.isArray(id) ? id[0] : id;

  const fetchOrderDetails = () => {
    if (!orderId || !user?.centerId) {
      console.log("Missing orderId or centerId:", {
        orderId,
        centerId: user?.centerId,
      });
      setIsLoading(false);
      return;
    }

    console.log("Fetching order:", { orderId, centerId: user.centerId });
    setIsLoading(true);
    const docRef = doc(db, `chcCenters/${user.centerId}/orders`, orderId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        console.log("Document exists:", docSnap.exists());
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("Order data:", data);
          const fetchedOrder: Order = {
            id: docSnap.id,
            equipmentId: data.equipmentId || "",
            equipmentName: data.equipmentName || "Unknown Equipment",
            equipmentRent: data.equipmentRent || 0,
            bookingHrs: data.bookingHrs || 0,
            bookingMode: data.bookingMode || "app",
            estimatedCost: data.estimatedCost || 0,
            status: (data.status as Order["status"]) || "Pending",
            userId: data.userId || "",
            userName: data.userName || "User",
            chcId: data.chcId || user.centerId || "",
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
            allocatedStartTime: data.allocatedStartTime
              ? data.allocatedStartTime.toDate()
              : null,
            allocatedEndTime: data.allocatedEndTime
              ? data.allocatedEndTime.toDate()
              : null,
              deliveryOtp: data.deliveryOtp || undefined,
          };

          console.log("Fetched order:", fetchedOrder);
          setOrder(fetchedOrder);
        } else {
          console.log("Order not found");
          Alert.alert("Error", "Order not found.");
          setOrder(null);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Failed to fetch order details:", error);
        Alert.alert("Error", "Could not load order details. " + error.message);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchOrderDetails();
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [orderId, user?.centerId]);

  const statusColor = (status: Order["status"] | undefined) => {
    switch (status) {
      case "Allocated":
        return "#007E6E";
      case "Delivered":
        return "#34C759";
      case "Returned":
        return "#007AFF";
      case "Pending":
      default:
        return "#FF9500";
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007E6E" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centeredContainer}>
        <Stack.Screen options={{ title: "Order Not Found" }} />
        <Text style={styles.errorText}>
          The requested order could not be found.
        </Text>
      </View>
    );
  }

  const isAllocated = order.status === "Allocated";
  const isDelivered = order.status === "Delivered";
  const isReturned = order.status === "Returned";

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `Order: ${order.equipmentName}`,
          headerStyle: { backgroundColor: "#007E6E" },
          headerTintColor: "#FFF",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusBox}>
          <IconSymbol
            name={
              isReturned
                ? "checkmark.circle.fill"
                : isDelivered
                ? "shippingbox.fill"
                : isAllocated
                ? "clock.badge.checkmark"
                : "clock.fill"
            }
            size={40}
            color={statusColor(order.status)}
          />
          <Text
            style={[
              styles.mainStatusText,
              { color: statusColor(order.status) },
            ]}
          >
            Status: {order.status}
          </Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Equipment & Rental</Text>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Equipment:</Text>
            <Text style={styles.value}>{order.equipmentName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Order ID:</Text>
            <Text style={styles.value}>{order.id}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Rent per hr:</Text>
            <Text style={styles.value}>₹{order.equipmentRent}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Booking Mode:</Text>
            <Text style={styles.value}>
              {order.bookingMode === "app" ? "Mobile App" : order.bookingMode}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Booking Hours:</Text>
            <Text style={styles.value}>{order.bookingHrs} hrs</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Estimated Cost:</Text>
            <Text style={styles.costValue}>₹{order.estimatedCost}</Text>
          </View>
        </View>
            {order.deliveryOtp && (
              <View style={styles.otpRow}>
                <IconSymbol name="lock.shield.fill" size={18} color="#FF9500" />
                <Text style={styles.otpLabel}>Delivery Verification OTP:</Text>
                <Text style={styles.otpValue}>{order.deliveryOtp}</Text>
              </View>
          )}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Details</Text>
          {(isAllocated || isDelivered || isReturned) &&
            order.allocatedStartTime && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Allocated Start:</Text>
                  <Text style={styles.allocatedTimeValue}>
                    {formatTime(order.allocatedStartTime)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Allocated End:</Text>
                  <Text style={styles.allocatedTimeValue}>
                    {formatTime(order.allocatedEndTime)}
                  </Text>
                </View>
              </>
            )}

          {order.status === "Pending" && (
            <View style={styles.pendingNote}>
              <IconSymbol name="info.circle.fill" size={16} color="#FF9500" />
              <Text style={styles.pendingText}>
                Waiting for CHC center allocation.
              </Text>
            </View>
          )}

          {order.status === "Allocated" && (
            <View style={[styles.pendingNote, { backgroundColor: "#e6f7f5" }]}>
              <IconSymbol
                name="checkmark.circle.fill"
                size={16}
                color="#007E6E"
              />
              <Text style={[styles.pendingText, { color: "#007E6E" }]}>
                Order has been allocated. Awaiting delivery.
              </Text>
            </View>
          )}

          {order.status === "Delivered" && (
            <View style={[styles.pendingNote, { backgroundColor: "#e6f9ec" }]}>
              <IconSymbol name="shippingbox.fill" size={16} color="#34C759" />
              <Text style={[styles.pendingText, { color: "#34C759" }]}>
                Equipment has been delivered. In use.
              </Text>
            </View>
          )}

          {order.status === "Returned" && (
            <View style={[styles.pendingNote, { backgroundColor: "#e6f2ff" }]}>
              <IconSymbol
                name="checkmark.circle.fill"
                size={16}
                color="#007AFF"
              />
              <Text style={[styles.pendingText, { color: "#007AFF" }]}>
                Equipment has been returned. Order completed.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E7DEAF",
  },
  otpRow: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#007E6E',
    alignItems: 'center',
  },
  otpLabel: { 
    fontSize: 16,
    color: '#333',
    fontWeight: '700',
    marginLeft: 10,
  },
  otpValue: { 
    fontSize: 20,
    fontWeight: '900',
    color: '#FF9500',
    textAlign: 'right',
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7DEAF",
    padding: 20,
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
  scrollContent: {
    padding: 20,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainStatusText: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 15,
  },
  detailsCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007E6E",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 5,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f7f7f7",
  },
  label: {
    fontSize: 15,
    color: "#666",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  costValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
  allocatedTimeValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#007E6E",
  },
  pendingNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff0e5",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  pendingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#FF9500",
    fontStyle: "italic",
  },
});
