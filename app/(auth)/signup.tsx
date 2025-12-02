// app/(auth)/signup.tsx
import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
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
import { db } from "../../firebase/firebaseConfig";
import useAuthStore from "@/store/authStore";

interface ChcCenter {
  id: string;
  name: string;
}

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [userImageUri, setUserImageUri] = useState<string | null>(null);

  const [chcCenters, setChcCenters] = useState<ChcCenter[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [selectedCenterName, setSelectedCenterName] = useState<string | null>(
    null
  );
  const [isCenterPickerVisible, setIsCenterPickerVisible] = useState(false);
  const [isFetchingCenters, setIsFetchingCenters] = useState(true);

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

  const handleSignup = async () => {
    const loginPhoneNumber = phoneNumber.trim();

    if (
      !name ||
      !loginPhoneNumber ||
      !password ||
      !address ||
      !selectedCenterId
    ) {
      Alert.alert(
        "Error",
        "Please fill in all required fields and select a CHC Center."
      );
      return;
    }

    useAuthStore.setState({ isLoading: true });

    try {
      const usersRef = collection(db, `chcCenters/${selectedCenterId}/users`);
      const q = query(usersRef, where("phoneNumber", "==", loginPhoneNumber));
      const existingUserSnapshot = await getDocs(q);

      if (!existingUserSnapshot.empty) {
        Alert.alert(
          "Signup Failed",
          "A user with this phone number already exists in this center. Please login."
        );
        return;
      }

      let userImageUrl = "";
      if (userImageUri) {
        userImageUrl = await uploadImageToCloudinary(userImageUri);
      }

      const newUser = {
        name,
        phoneNumber: loginPhoneNumber,
        password: password,
        address,
        userImage: userImageUrl,
        createdAt: serverTimestamp(),
        centerName: selectedCenterName || "",
      };

      const docRef = await addDoc(usersRef, newUser);

      const loggedInUser = {
        uid: docRef.id,
        name: newUser.name,
        phoneNumber: newUser.phoneNumber,
        address: newUser.address,
        userImage: newUser.userImage,
        centerId: selectedCenterId!,
        centerName: newUser.centerName,
      };

      login(loggedInUser as any);
      router.replace("/(tabs)/dashboard");
      Alert.alert("Success", "Account created successfully!");
    } catch (error: any) {
      console.error("Signup error:", error);
      let errorMessage =
        "An error occurred during signup. Please check your network and try again.";
      Alert.alert("Signup Failed", errorMessage);
    } finally {
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

  const buttonText = isLoading ? "Creating Account..." : "Sign Up";

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
            disabled={isFetchingCenters}
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
          />

          <TextInput
            style={styles.input}
            placeholder="Phone Number (Required)"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password (Required)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Address (Required)"
            value={address}
            onChangeText={setAddress}
            autoCorrect={false}
          />

          <Text
            style={[styles.button, isLoading && styles.disabledButton]}
            onPress={!isLoading ? handleSignup : () => {}}
          >
            {buttonText}
          </Text>

          <Link href="/login" style={styles.link}>
            <ThemedText type="link">Already a user? Login</ThemedText>
          </Link>
        </View>
      </ScrollView>
      <CenterPicker />
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
