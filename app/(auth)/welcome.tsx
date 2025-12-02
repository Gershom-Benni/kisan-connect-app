import { Link } from "expo-router";
import React from "react";
import { StyleSheet, Text, View, Image, Pressable } from "react-native";

import { ThemedText } from "@/components/themed-text";

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/images/kisan-connect-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <ThemedText type="title" style={styles.title}>
        Welcome
      </ThemedText>

      <View style={styles.buttonContainer}>
        <Link href="/login" asChild>
          <Pressable style={styles.loginButton}>
            <Text style={styles.buttonText}>Login</Text>
          </Pressable>
        </Link>
        <Link href="/signup" asChild>
          <Pressable style={styles.signupButton}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#E7DEAF",
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  title: {
    marginBottom: 40,
    color: "#999999",
  },
  buttonContainer: {
    width: "80%",
  },
  loginButton: {
    backgroundColor: "#007AFF",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: "center",
  },
  signupButton: {
    backgroundColor: "#007E6E",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
