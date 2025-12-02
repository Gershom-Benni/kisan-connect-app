// app/(auth)/login.tsx
import {
  collectionGroup,
  getDocs,
  query,
  where,
} from "firebase/firestore";
// REVERTED: Import from 'firebase/auth' (JS SDK)
import { getAuth, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'; 
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View, TextInput, Text, Image, Alert, Platform } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { auth, db } from "../../firebase/firebaseConfig"; // Get 'auth' from firebaseConfig
import useAuthStore from "@/store/authStore";

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    // Sanitize and format phone number to E.164 format (+[country code][number])
    const sanitizedPhoneNumber = phoneNumber.replace(/\s/g, ''); 
    const fullPhoneNumber = sanitizedPhoneNumber.startsWith('+') ? sanitizedPhoneNumber : '+91' + sanitizedPhoneNumber;

    if (!fullPhoneNumber.startsWith('+') || fullPhoneNumber.length < 10) {
      Alert.alert("Error", "Please enter a valid phone number in E.164 format (e.g., +918754672089).");
      return;
    }

    useAuthStore.setState({ isLoading: true });
    try {
      // 1. Check if user exists in Firestore 
      const usersRef = collectionGroup(db, "users");
      const q = query(usersRef, where("phoneNumber", "==", fullPhoneNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert(
          "Login Failed",
          "No existing account found with this phone number. Please sign up."
        );
        return;
      }
      
      // 2. Prepare app verifier (uses reCAPTCHA for web/Expo Go)
      const appVerifier = Platform.OS === 'web' ? (window as any).recaptchaVerifier : undefined; 
      
      const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      setConfirmationResult(result);
      Alert.alert("Success", `OTP sent to ${fullPhoneNumber}`);
    } catch (error) {
      console.error("Error during OTP request:", error);
      Alert.alert(
        "OTP Request Failed",
        "Could not send OTP. Check network & phone number format (+91...). If running in Expo Go, this may be due to the reCAPTCHA failing."
      );
    } finally {
      useAuthStore.setState({ isLoading: false });
    }
  };


  // Step 2: Verify OTP and Log In
  const handleLogin = async () => {
    if (!confirmationResult || !verificationCode) {
      Alert.alert("Error", "Please enter the OTP.");
      return;
    }

    useAuthStore.setState({ isLoading: true });

    try {
      // 1. Verify OTP with Firebase Auth
      const userCredential = await confirmationResult.confirm(verificationCode);
      const firebaseUser = userCredential.user;

      // 2. Fetch user data from Firestore
      const usersRef = collectionGroup(db, "users");
      const q = query(usersRef, where("phoneNumber", "==", firebaseUser.phoneNumber));
      const querySnapshot = await getDocs(q);

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
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
      console.error("Login/OTP verification error:", error);
      if (error.code === 'auth/invalid-verification-code') {
        Alert.alert("Login Failed", "The verification code is invalid or has expired.");
      } else {
        Alert.alert(
          "Login Error",
          "An error occurred during login. Please try again."
        );
      }
    } finally {
      setConfirmationResult(null); // Reset confirmation state on success/failure
      setVerificationCode("");
      useAuthStore.setState({ isLoading: false });
    }
  };

  const isOtpSent = !!confirmationResult;
  const submitFunction = isOtpSent ? handleLogin : handleSendOtp;
  const buttonText = isLoading
    ? (isOtpSent ? "Verifying..." : "Sending OTP...")
    : (isOtpSent ? "Verify OTP and Log In" : "Send OTP");


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
        placeholder="Phone Number (E.164 format, e.g., +918754672089)"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        autoCapitalize="none"
        editable={!isOtpSent}
      />

      {isOtpSent && ( 
        <TextInput
          style={styles.input}
          placeholder="Enter OTP"
          value={verificationCode}
          onChangeText={setVerificationCode}
          keyboardType="number-pad"
          secureTextEntry={false}
        />
      )}

      <Text
        style={[styles.button, isLoading && styles.disabledButton]}
        onPress={!isLoading ? submitFunction : () => {}}
      >
        {buttonText}
      </Text>

      <Link href="/signup" style={styles.link}>
        <ThemedText type="link">New user? Sign up now</ThemedText>
      </Link>
      
      {Platform.OS === 'web' && <View id="recaptcha-container" />} 
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