// app/(tabs)/voice-assistant.tsx
import { Stack, useRouter } from "expo-router";
import React, { useState, useRef, useEffect } from "react";
import { 
    StyleSheet, View, Text, TextInput, ScrollView, 
    TouchableOpacity, ActivityIndicator, Platform, Alert, Animated, Easing
} from "react-native";
import { IconSymbol } from "../../components/ui/icon-symbol"; 
import useAuthStore from "../../store/authStore"; 
import { executeBookingAction } from "../../utils/bookingUtils"; 
import { ThemedText } from "../../components/themed-text"; 
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig"; 
import Ionicons from "@expo/vector-icons/build/Ionicons";

const GEMINI_API_KEY = "AIzaSyClS_Ondis5NJeSLECxUv1HbJADZD_rQkU";
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
}

interface BookingData {
    equipmentId: string;
    bookingHrs: number;
}

interface ActionPayload {
    action: 'CREATE_ORDER' | 'SUGGEST_EQUIPMENT';
    data: BookingData | { message: string };
}


let equipmentList: { id: string; name: string; rent: number }[] = []; 


/**
 * Calls the real Gemini API with function calling capability
 * @param userText The user's input text.
 * @param equipmentList Current list of available equipment.
 * @returns A structured ActionPayload.
 */
const callGeminiApiForBooking = async (userText: string, equipmentList: any[]): Promise<ActionPayload> => {
    const tools = [{
        function_declarations: [{
            name: "createOrder",
            description: "Creates a new equipment rental order when user explicitly requests to book or rent specific equipment for a specific duration.",
            parameters: {
                type: "object",
                properties: {
                    equipmentName: {
                        type: "string",
                        description: "The name of the equipment to be booked (e.g., 'Tractor with Rotavator', 'Seeder'). Must match one of the equipment names from the available list.",
                    },
                    bookingHrs: {
                        type: "number",
                        description: "The number of hours the user wants to rent the equipment. Must be greater than 0.",
                    },
                },
                required: ["equipmentName", "bookingHrs"],
            },
        }]
    }];

    console.log("Equipment list length:", equipmentList.length);
    
    if (equipmentList.length === 0) {
        return {
            action: 'SUGGEST_EQUIPMENT',
            data: { message: "I'm still loading the equipment list. Please wait a moment and try again." }
        };
    }
    
    const availableEquipmentDetails = equipmentList.map((e, index) => 
        `${index + 1}. ${e.name} - ₹${e.rent}/hr`
    ).join('\n');
    
    console.log("Available equipment details:", availableEquipmentDetails);
    const systemInstruction = {
        parts: [{
            text: `You are an expert CHC Equipment Booking Assistant.

Available Equipment:
${availableEquipmentDetails}

Instructions:
1. If the user explicitly asks to book/rent equipment with a specific duration, use the createOrder function with the FULL equipmentId and bookingHrs.
2. If asking for suggestions, availability, or general info, respond conversationally WITHOUT using the function.
3. Be friendly, concise, and helpful.
4. Dont use unnecessary words.`
        }]
    };

    const requestBody = {
        system_instruction: systemInstruction,
        contents: [{
            parts: [{ text: userText }]
        }],
        tools: tools
    };

    if (!GEMINI_API_KEY) {
        return { 
            action: 'SUGGEST_EQUIPMENT', 
            data: { message: "Error: Gemini API Key is missing." } 
        };
    }

    try {
        console.log("Calling Gemini API with model:", GEMINI_MODEL);
        
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const responseText = await response.text();
        console.log("Response status:", response.status);
        console.log("Response text:", responseText);

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}: ${responseText}`);
        }

        const data = JSON.parse(responseText);
        const candidates = data.candidates || [];
        if (candidates.length > 0) {
            const firstCandidate = candidates[0];
            const content = firstCandidate.content;
            
            if (content && content.parts) {
                for (const part of content.parts) {
                    if (part.functionCall) {
                        const functionCall = part.functionCall;
                        
                        if (functionCall.name === 'createOrder') {
                            const args = functionCall.args;
                            const equipmentName = String(args.equipmentName);
                            
                            const equipment = equipmentList.find(e => 
                                e.name.toLowerCase() === equipmentName.toLowerCase()
                            );
                            
                            if (!equipment) {
                                return {
                                    action: 'SUGGEST_EQUIPMENT',
                                    data: { message: `I couldn't find equipment named "${equipmentName}". Please check the available equipment list.` }
                                };
                            }
                            
                            return {
                                action: 'CREATE_ORDER',
                                data: {
                                    equipmentId: equipment.id,
                                    bookingHrs: Number(args.bookingHrs),
                                } as BookingData,
                            };
                        }
                    }
                    
                    if (part.text) {
                        return {
                            action: 'SUGGEST_EQUIPMENT',
                            data: { message: part.text }
                        };
                    }
                }
            }
        }

        return {
            action: 'SUGGEST_EQUIPMENT',
            data: { 
                message: "I received an unclear response. Please try rephrasing your request."
            }
        };

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        
        return {
            action: 'SUGGEST_EQUIPMENT',
            data: { 
                message: `Connection error: ${(error as Error).message}. Please check your network and API key.` 
            }
        };
    }
};

interface WaveProps {
    isListening: boolean;
}

const AnimatedWave = ({ isListening }: WaveProps) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    
    useEffect(() => {
        if (isListening) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.2,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1.0,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            scaleAnim.stopAnimation(() => scaleAnim.setValue(1));
        }
    }, [isListening]);

    return (
        <View style={waveStyles.container}>
            <Animated.View
                style={[
                    waveStyles.waveOuter,
                    { transform: [{ scale: scaleAnim }] },
                ]}
            />
            <View style={waveStyles.logoContainer}>
                <Ionicons name="chatbox-ellipses" size={26} color={"white"} />
            </View>
        </View>
    );
};

export default function VoiceAssistantScreen() {
    const user = useAuthStore((state) => state.user);
    const scrollViewRef = useRef<ScrollView>(null);
    const router = useRouter();
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isEquipmentLoaded, setIsEquipmentLoaded] = useState(false);

    useEffect(() => {
        const loadEquipment = async () => {
            if (user && !isEquipmentLoaded) {
                try {
                    console.log("Loading equipment for center:", user.centerId);
                    
                    const equipmentRef = collection(db, `chcCenters/${user.centerId}/equipment`);
                    const equipmentSnapshot = await getDocs(equipmentRef);
                    
                    const loadedEquipment = equipmentSnapshot.docs.map(doc => ({
                        id: doc.id,
                        name: doc.data().name || "Unknown",
                        rent: doc.data().rent || 0,
                    }));
                    
                    console.log("Loaded equipment:", loadedEquipment.length, "items");
                    console.log("Equipment details:", JSON.stringify(loadedEquipment, null, 2));
                    
                    equipmentList = loadedEquipment;
                    setIsEquipmentLoaded(true);
                    
                    const firstEquipmentName = loadedEquipment[0]?.name || 'equipment';
                    setMessages([{ 
                        id: 1, 
                        text: `Welcome ${user.name}! I am your AI voice assistant. I found ${loadedEquipment.length} equipment items available. Try asking "What is available?" or "Book ${firstEquipmentName} for 3 hours".`, 
                        sender: 'bot' 
                    }]);
                } catch (error) {
                    console.error("Failed to load equipment list:", error);
                    setIsEquipmentLoaded(true);
                    setMessages([{ 
                        id: 1, 
                        text: `Welcome ${user.name}! I am your voice assistant. Failed to load equipment list. Error: ${error.message}`, 
                        sender: 'bot' 
                    }]);
                }
            }
        };
        
        loadEquipment();
    }, [user, isEquipmentLoaded]); 

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputText.trim() || isProcessing || !user || !isEquipmentLoaded) {
            console.log("Cannot send message:", { 
                hasInput: !!inputText.trim(), 
                isProcessing, 
                hasUser: !!user, 
                isEquipmentLoaded 
            });
            return;
        }
        
        console.log("Equipment list at send time:", equipmentList.length, "items");
        
        const userMessage: Message = { id: Date.now(), text: inputText.trim(), sender: 'user' };
        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        setIsProcessing(true);

        try {
            const aiResponse = await callGeminiApiForBooking(userMessage.text, equipmentList); 
            
            let finalBotMessageText = '';

            if (aiResponse.action === 'CREATE_ORDER') { 
                const bookingData = aiResponse.data as BookingData;
                
                const result = await executeBookingAction({
                    equipmentId: bookingData.equipmentId,
                    bookingHrs: bookingData.bookingHrs,
                });

                finalBotMessageText = result.message;
                
                if (result.success) {
                    router.push("/(tabs)/rents");
                }

            } else {
                finalBotMessageText = (aiResponse.data as { message: string }).message;
            }
            
            setMessages((prev) => [...prev, {
                id: Date.now() + 1,
                text: finalBotMessageText,
                sender: 'bot',
            }]);

        } catch (error) {
            console.error("Chatbot/Action Error:", error);
            setMessages((prev) => [...prev, { 
                id: Date.now() + 2, 
                text: "I encountered an error while processing your request. Please try again.", 
                sender: 'bot' 
            }]);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const renderMessage = (item: Message) => (
        <View key={item.id} style={[
            chatStyles.messageRow,
            item.sender === 'user' ? chatStyles.userRow : chatStyles.botRow,
        ]}>
            <View style={[
                chatStyles.bubble,
                item.sender === 'user' ? chatStyles.userBubble : chatStyles.botBubble,
            ]}>
                <Text style={item.sender === 'user' ? chatStyles.userText : chatStyles.botText}>
                    {item.text}
                </Text>
            </View>
        </View>
    );

    const toggleListening = () => {
        if (!isListening) {
            console.log("Voice input started (placeholder - implement STT)");
            Alert.alert(
                "Voice Input", 
                "Speech-to-text is not yet implemented. Please use the text input for now.",
                [{ text: "OK" }]
            );
        } else {
            console.log("Voice input stopped");
        }

        setIsListening(prev => !prev);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen 
                options={{ 
                    title: "AI Voice Assistant",
                    headerStyle: { backgroundColor: "#007AFF" },
                    headerTintColor: "#FFF",
                }} 
            />
            
            <View style={styles.waveSection}>
                <AnimatedWave isListening={isListening || isProcessing} />
                <ThemedText type="subtitle" style={styles.assistantTitle}>
                    CHC Assistant
                </ThemedText>
                {isProcessing && (
                    <View style={styles.statusRow}>
                        <ActivityIndicator size="small" color="#007E6E" />
                        <Text style={styles.statusText}>Processing command...</Text>
                    </View>
                )}
                {!isProcessing && !isListening && (
                    <Text style={styles.statusText}>Ask me anything about equipment!</Text>
                )}
            </View>

            <ScrollView 
                style={styles.chatArea}
                contentContainerStyle={styles.chatContent}
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
            >
                {messages.map(renderMessage)}
                <View style={{ height: 10 }} /> 
            </ScrollView>

            <View style={styles.inputContainer}>
                <TouchableOpacity 
                    style={[styles.micButton, isListening && styles.micButtonActive]}
                    onPress={toggleListening}
                    disabled={isProcessing}
                >
                    <IconSymbol 
                        name={isListening ? "waveform.circle.fill" : "mic.fill"} 
                        size={24} 
                        color="#fff" 
                    />
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="Type your command here ..."
                    placeholderTextColor="#999"
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleSendMessage}
                    editable={!isProcessing}
                />
                <TouchableOpacity
                    style={[styles.sendButton, (isProcessing || !inputText) && styles.disabledButton]}
                    onPress={handleSendMessage}
                    disabled={isProcessing || !inputText}
                >
                    <IconSymbol name="arrow.up.circle.fill" size={24} color="#000" />
                </TouchableOpacity>
            </View>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#E7DEAF",
    },
    waveSection: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: 'white',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        paddingBottom: 30,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    assistantTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#007AFF',
        marginTop: 10,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    statusText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 5,
    },
    chatArea: {
        flex: 1,
        paddingHorizontal: 15,
    },
    chatContent: {
        paddingTop: 10,
        paddingBottom: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    },
    micButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    micButtonActive: {
        backgroundColor: '#ff3b30',
    },
    input: {
        flex: 1,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 20,
        marginRight: 10,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#007E6E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.5,
    },
});

const chatStyles = StyleSheet.create({
    messageRow: {
        flexDirection: 'row',
        marginVertical: 4,
    },
    userRow: {
        justifyContent: 'flex-end',
    },
    botRow: {
        justifyContent: 'flex-start',
    },
    bubble: {
        maxWidth: '80%',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    userBubble: {
        backgroundColor: '#007AFF',
        borderBottomRightRadius: 5,
    },
    botBubble: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 5,
        borderColor: '#007E6E',
        borderWidth: 1,
    },
    userText: {
        color: 'white',
        fontSize: 16,
    },
    botText: {
        color: '#333',
        fontSize: 16,
    },
});

const waveStyles = StyleSheet.create({
    container: {
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    waveOuter: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 75,
        backgroundColor: '#007AFF',
        opacity: 0.2,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 70,
        height: 70,
        tintColor: 'white',
    }
});