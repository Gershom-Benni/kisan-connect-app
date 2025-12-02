// app/(auth)/login.tsx
import { collectionGroup, getDocs, query, where } from "firebase/firestore";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View, TextInput, Text, Image, Alert } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { db } from "../../firebase/firebaseConfig";
import useAuthStore from "@/store/authStore";

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");

  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();

  const handleLogin = async () => {
    const loginPhoneNumber = phoneNumber.trim();

    if (!loginPhoneNumber || !password) {
      Alert.alert("Error", "Please enter both phone number and password.");
      return;
    }

    useAuthStore.setState({ isLoading: true });

    try {
      const usersRef = collectionGroup(db, "users");
      const q = query(usersRef, where("phoneNumber", "==", loginPhoneNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert("Login Failed", "Invalid phone number or password.");
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (userData.password !== password) {
        Alert.alert("Login Failed", "Invalid phone number or password.");
        return;
      }

      const centerId = userDoc.ref.parent.parent?.id || "unknown";

      const user = {
        uid: userDoc.id,
        name: userData.name,
        phoneNumber: userData.phoneNumber,
        address: userData.address,
        userImage: userData.userImage,
        centerId: centerId,
        centerName: userData.centerName || `Center ID: ${centerId}`,
      };

      login(user as any);
      router.replace("/(tabs)/Dashboard");
    } catch (error: any) {
      console.error("Login Error:", error);
      Alert.alert(
        "Login Failed",
        "An error occurred during login. Please check your network."
      );
    } finally {
      useAuthStore.setState({ isLoading: false });
    }
  };

  const buttonText = isLoading ? "Logging In..." : "Log In";

  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/images/kisan-connect-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <ThemedText type="title" style={styles.title}>
        Login
      </ThemedText>

      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={true}
        autoCapitalize="none"
      />

      <Text
        style={[styles.button, isLoading && styles.disabledButton]}
        onPress={!isLoading ? handleLogin : () => {}}
      >
        {buttonText}
      </Text>

      <Link href="/signup" style={styles.link}>
        <ThemedText type="link">New user? Sign up now</ThemedText>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 30,
    backgroundColor: "#E7DEAF",
    paddingTop: 80,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 40,
  },
  title: {
    marginBottom: 30,
    color: "#999999",
  },
  input: {
    width: "100%",
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#007E6E",
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    width: "100%",
    textAlign: "center",
    paddingVertical: 15,
    borderRadius: 8,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    backgroundColor: "#007AFF",
    color: "white",
    overflow: "hidden",
  },
  disabledButton: {
    opacity: 0.6,
  },
  link: {
    marginTop: 15,
  },
});
