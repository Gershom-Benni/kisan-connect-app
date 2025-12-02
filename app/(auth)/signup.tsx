// app/(auth)/signup.tsx
import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
// REVERTED: Import from 'firebase/auth' (JS SDK)
import { signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import * as ImagePicker from "expo-image-picker";
import { Link, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  Image,
  Alert,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { uploadImageToCloudinary } from "../../utils/cloudinaryUploader";
import { ThemedText } from "@/components/themed-text";
import { auth, db } from "../../firebase/firebaseConfig"; // Get 'auth' from firebaseConfig
import useAuthStore from "@/store/authStore";

interface ChcCenter {
  id: string;
  name: string;
}

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [address, setAddress] = useState("");
  const [userImageUri, setUserImageUri] = useState<string | null>(null);

  const [chcCenters, setChcCenters] = useState<ChcCenter[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [selectedCenterName, setSelectedCenterName] = useState<string | null>(null);
  const [isCenterPickerVisible, setIsCenterPickerVisible] = useState(false);
  const [isFetchingCenters, setIsFetchingCenters] = useState(true);
  
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const isLoading = useAuthStore((state) => state.isLoading);
  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  const fetchChcCenters = async () => {
    setIsFetchingCenters(true);
    try {
      const centersRef = collection(db, "chcCenters");
      const snapshot = await getDocs(centersRef);

      const centers: ChcCenter[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || "Unnamed Center",
      }));

      setChcCenters(centers);
    } catch (error) {
      console.error("Failed to fetch CHC Centers:", error);
      Alert.alert(
        "Error",
        "Could not load CHC Centers. Please check your network and try again."
      );
    } finally {
      setIsFetchingCenters(false);
    }
  };

  useEffect(() => {
    fetchChcCenters();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setUserImageUri(result.assets[0].uri);
    }
  };

  const handleSendOtp = async () => {
    const sanitizedPhoneNumber = phoneNumber.replace(/\s/g, ''); 
    const fullPhoneNumber = sanitizedPhoneNumber.startsWith('+') ? sanitizedPhoneNumber : '+91' + sanitizedPhoneNumber;

    if (!name || !fullPhoneNumber || !address || !selectedCenterId) {
      Alert.alert(
        "Error",
        "Please fill in all required fields (Name, Phone Number, Address) and select a CHC Center."
      );
      return;
    }
    
    if (!fullPhoneNumber.startsWith('+') || fullPhoneNumber.length < 10) {
      Alert.alert("Error", "Please enter a valid phone number in E.164 format (e.g., +918754672089).");
      return;
    }

    useAuthStore.setState({ isLoading: true });

    try {
      // 1. Check if user already exists in Firestore 
      const usersRef = collection(db, `chcCenters/${selectedCenterId}/users`);
      const q = query(usersRef, where("phoneNumber", "==", fullPhoneNumber));
      const existingUserSnapshot = await getDocs(q);

      if (!existingUserSnapshot.empty) {
        Alert.alert(
          "Signup Failed",
          "A user with this phone number already exists in this center. Please login."
        );
        return;
      }
      
      // 2. Prepare app verifier (uses reCAPTCHA for web/Expo Go)
      const appVerifier = Platform.OS === 'web' ? (window as any).recaptchaVerifier : undefined;

      const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      setConfirmationResult(result);
      Alert.alert("Success", `OTP sent to ${fullPhoneNumber}. Please verify to complete sign up.`);

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
  
  const handleSignup = async () => {
    if (!confirmationResult || !verificationCode) {
      Alert.alert("Error", "Please enter the OTP.");
      return;
    }

    useAuthStore.setState({ isLoading: true });
    
    try {
      // 1. Verify OTP
      const userCredential = await confirmationResult.confirm(verificationCode);
      const firebaseUser = userCredential.user;
      
      // 2. Upload image and create user document in Firestore
      let userImageUrl = "";
      if (userImageUri) {
        userImageUrl = await uploadImageToCloudinary(userImageUri);
      }
      
      const usersRef = collection(db, `chcCenters/${selectedCenterId}/users`);

      const newUser = {
        name,
        phoneNumber: firebaseUser.phoneNumber,
        address,
        userImage: userImageUrl,
        createdAt: serverTimestamp(),
        centerName: selectedCenterName || "", 
      };

      const docRef = await addDoc(usersRef, newUser);

      const loggedInUser = {
        uid: docRef.id, 
        name: newUser.name,
        phoneNumber: newUser.phoneNumber!,
        address: newUser.address,
        userImage: newUser.userImage,
        centerId: selectedCenterId!,
        centerName: newUser.centerName,
      };

      login(loggedInUser as any); 
      router.replace("/(tabs)/dashboard");
      Alert.alert("Success", "Account created successfully!");
    } catch (error: any) {
      console.error("Signup/OTP verification error:", error);
      if (error.code === 'auth/invalid-verification-code') {
        Alert.alert("Signup Failed", "The verification code is invalid or has expired.");
      } else {
        Alert.alert(
          "Signup Error",
          "An error occurred during signup. Please try again."
        );
      }
    } finally {
      setConfirmationResult(null);
      setVerificationCode("");
      useAuthStore.setState({ isLoading: false });
    }
  };

  const handleSelectCenter = (center: ChcCenter) => {
    setSelectedCenterId(center.id);
    setSelectedCenterName(center.name);
    setIsCenterPickerVisible(false);
  };

  const CenterPicker = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isCenterPickerVisible}
      onRequestClose={() => setIsCenterPickerVisible(false)}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Select CHC Center</Text>
          {isFetchingCenters ? (
            <Text>Loading centers...</Text>
          ) : chcCenters.length === 0 ? (
            <Text>No centers found.</Text>
          ) : (
            <FlatList
              data={chcCenters}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.centerItem}
                  onPress={() => handleSelectCenter(item)}
                >
                  <Text>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity
            style={[styles.button, styles.buttonClose]}
            onPress={() => setIsCenterPickerVisible(false)}
          >
            <Text style={styles.textStyle}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  const isOtpSent = !!confirmationResult;
  const submitFunction = isOtpSent ? handleSignup : handleSendOtp;
  const buttonText = isLoading
    ? (isOtpSent ? "Verifying..." : "Sending OTP...")
    : (isOtpSent ? "Verify OTP and Sign Up" : "Send OTP");

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainerContent}
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <ThemedText type="title" style={styles.title}>
            Create Account
          </ThemedText>

          <TouchableOpacity
            onPress={pickImage}
            style={styles.profilePicContainer}
            disabled={isOtpSent}
          >
            {userImageUri ? (
              <Image source={{ uri: userImageUri }} style={styles.profilePic} />
            ) : (
              <Text style={styles.profilePicPlaceholder}>
                + Add Profile Picture (Optional)
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setIsCenterPickerVisible(true)}
            disabled={isFetchingCenters || isOtpSent}
          >
            <Text
              style={[
                styles.inputPlaceholder,
                selectedCenterName && styles.inputSelectedText,
              ]}
            >
              {selectedCenterName ||
                (isFetchingCenters
                  ? "Loading Centers..."
                  : "Select CHC Center (Required)")}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Full Name (Required)"
            value={name}
            onChangeText={setName}
            autoCorrect={false}
            editable={!isOtpSent}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Phone Number (Required - E.164 format, e.g., +918754672089)"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isOtpSent}
          />
          
          {isOtpSent && (
            <TextInput
              style={styles.input}
              placeholder="Enter OTP"
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Address (Required)"
            value={address}
            onChangeText={setAddress}
            autoCorrect={false}
            editable={!isOtpSent}
          />

          <Text
            style={[styles.button, isLoading && styles.disabledButton]}
            onPress={!isLoading ? submitFunction : () => {}}
          >
            {buttonText}
          </Text>

          <Link href="/login" style={styles.link}>
            <ThemedText type="link">Already a user? Login</ThemedText>
          </Link>
        </View>
      </ScrollView>
      <CenterPicker />
      {Platform.OS === 'web' && <View id="recaptcha-container" />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: "#E7DEAF",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContainerContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 50,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    padding: 30,
    paddingTop: 50,
  },
  title: {
    marginBottom: 30,
    color: "#999999",
  },
  profilePicContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  profilePicPlaceholder: {
    textAlign: "center",
    fontSize: 12,
    color: "#666",
    paddingHorizontal: 10,
  },
  profilePic: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },
  inputContainer: {
    width: "100%",
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#007E6E",
    borderRadius: 8,
    justifyContent: "center",
  },
  inputPlaceholder: {
    fontSize: 16,
    color: "gray",
  },
  inputSelectedText: {
    color: "black",
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
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "80%",
    maxHeight: "70%",
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
  centerItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    width: "100%",
    alignItems: "center",
  },
  buttonClose: {
    backgroundColor: "#2196F3",
    marginTop: 15,
    width: "100%",
    paddingVertical: 10,
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
});