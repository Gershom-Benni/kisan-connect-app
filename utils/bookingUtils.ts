// utils/bookingUtils.ts
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig"; 
import useAuthStore from "@/store/authStore"; 

/**
 * Generates a 4-digit OTP, mirroring the logic in app/rent/summary.tsx.
 * @returns {string} The 4-digit OTP.
 */
const generateOtp = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

interface BookingData {
    equipmentId: string;
    bookingHrs: number;
}

/**
 * Executes a client-side Firestore booking transaction based on AI-parsed data.
 * @param {BookingData} bookingData The structured data from the AI command.
 * @returns {Promise<{success: boolean, message: string}>} Result of the operation.
 */
export async function executeBookingAction(bookingData: BookingData) {
    const user = useAuthStore.getState().user;

    if (!user || !user.centerId || !user.uid) {
        return { success: false, message: "Authentication failed. Please log in again." };
    }
    
    const { equipmentId, bookingHrs } = bookingData;

    if (!equipmentId || bookingHrs <= 0) {
         return { success: false, message: "Invalid equipment ID or booking hours provided." };
    }

    let equipmentName = "Unknown Equipment";
    let equipmentRent = 0; 

    try {
        const equipmentDocRef = doc(db, `chcCenters/${user.centerId}/equipment`, equipmentId);
        const equipmentDocSnap = await getDoc(equipmentDocRef);

        if (!equipmentDocSnap.exists()) {
             return { success: false, message: `Equipment with ID ${equipmentId} not found at your center.` };
        }
        
        const data = equipmentDocSnap.data();
        equipmentName = data.name || "Unnamed Equipment";
        equipmentRent = data.rent || 0;

        if (equipmentRent === 0) {
             return { success: false, message: `Equipment rate is missing or zero. Cannot book.` };
        }
    } catch (error) {
        console.error("Error fetching equipment details:", error);
        return { success: false, message: "Failed to retrieve equipment details from database." };
    }

    const estimatedCost = equipmentRent * bookingHrs;
    const deliveryOtp = generateOtp();
    const ordersRef = collection(db, `chcCenters/${user.centerId}/orders`);

    try {
        const newOrder = {
            equipmentId: equipmentId,
            equipmentName: equipmentName,
            equipmentRent: equipmentRent,
            deliveryOtp: deliveryOtp,
            userId: user.uid,
            userName: user.name,
            bookingMode: "voice-bot",
            bookingHrs: bookingHrs,
            estimatedCost: estimatedCost,
            status: "Pending",
            chcId: user.centerId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(ordersRef, newOrder);
        
        return { 
            success: true, 
            message: `Successfully booked ${equipmentName} for ${bookingHrs} hours (Order ID: ${docRef.id.substring(0, 4)}). Estimated cost: ₹${estimatedCost}.`,
            orderId: docRef.id
        };
    } catch (error) {
        console.error("Firestore booking error:", error);
        return { success: false, message: "An error occurred during booking. Please try again." };
    }
}