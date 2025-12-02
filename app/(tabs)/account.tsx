// app/(tabs)/account.tsx
import { Stack } from "expo-router";
import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import useAuthStore from "@/store/authStore";

export default function AccountScreen() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Account" }} />
      <ThemedText type="title" style={styles.title}>
        Account Details
      </ThemedText>

      <View style={styles.detailContainer}>
        <Text style={styles.detailText}>
          Name: <Text style={styles.detailValue}>{user?.name}</Text>
        </Text>
        <Text style={styles.detailText}>
          Phone: <Text style={styles.detailValue}>{user?.phoneNumber}</Text> {/* REVERTED: Changed back to Phone */}
        </Text>
        <Text style={styles.detailText}>
          Center: <Text style={styles.detailValue}>{user?.centerName}</Text>
        </Text>
        <Text style={styles.detailText}>
          Address:{" "}
          <Text style={styles.detailValue}>{user?.address || "N/A"}</Text>
        </Text>
      </View>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 30,
    backgroundColor: "#E7DEAF",
  },
  title: {
    color: "#007E6E",
    marginBottom: 20,
  },
  detailContainer: {
    width: "100%",
    marginTop: 30,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007E6E",
    maxWidth: 400,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#999999",
    fontWeight: "600",
  },
  detailValue: {
    color: "#333",
    fontWeight: "normal",
  },
  logoutButton: {
    marginTop: 40,
    width: "100%",
    maxWidth: 400,
    padding: 15,
    backgroundColor: "#ff3b30",
    borderRadius: 8,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});