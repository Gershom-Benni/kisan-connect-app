// app/(tabs)/rents.tsx
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'; 
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect , useRef} from 'react';
import { 
    StyleSheet, View, Text, FlatList, ActivityIndicator, 
    TouchableOpacity, RefreshControl, Platform, Animated, Easing, Alert // ADDED IMPORTS
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import useAuthStore from '@/store/authStore';
import { db } from '../../firebase/firebaseConfig';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface Order {
    id: string;
    equipmentName: string;
    bookingHrs: number; 
    estimatedCost: number;
    status: 'Pending' | 'Allocated' | 'Delivered' | 'Returned'; 
    createdAt: Date; 
}
interface BannerProps {
    message: string;
    type: 'success' | 'info';
    isVisible: boolean;
    onClose: () => void;
}
const formatOrderDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};
const BannerNotification = ({ message, type, isVisible, onClose }: BannerProps) => {
    const translateY = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        if (isVisible) {
            Animated.timing(translateY, {
                toValue: 0,
                duration: 300,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }).start(() => {
                setTimeout(() => {
                    Animated.timing(translateY, {
                        toValue: -100,
                        duration: 400,
                        easing: Easing.in(Easing.ease),
                        useNativeDriver: true,
                    }).start(onClose);
                }, 3000); // Display for 3 seconds
            });
        } else {
            translateY.setValue(-100);
        }
    }, [isVisible]);

    const backgroundColor = type === 'success' ? '#34C759' : '#007AFF';
    const iconName = type === 'success' ? 'checkmark.circle.fill' : 'info.circle.fill';

    return (
        <Animated.View style={[
            bannerStyles.container,
            { backgroundColor },
            { transform: [{ translateY }] }
        ]}>
            <IconSymbol name={iconName} size={20} color="white" style={{ marginRight: 10 }} />
            <Text style={bannerStyles.messageText}>{message}</Text>
            <TouchableOpacity onPress={onClose} style={bannerStyles.closeButton}>
                <IconSymbol name="xmark" size={18} color="white" />
            </TouchableOpacity>
        </Animated.View>
    );
};
const notifyStatusChange = (oldOrders: Order[], newOrders: Order[], setBanner: any) => {
    newOrders.forEach(newOrder => {
        const oldOrder = oldOrders.find(o => o.id === newOrder.id);
        
        if (oldOrder && oldOrder.status !== newOrder.status) {
            const statusMap = {
                'Allocated': { type: 'info', message: `Order #${newOrder.id.substring(0, 4)} allocated!` },
                'Delivered': { type: 'success', message: `Order #${newOrder.id.substring(0, 4)} delivered.` },
                'Returned': { type: 'success', message: `Order #${newOrder.id.substring(0, 4)} completed!` },
                'Pending': null,
            };

            const notification = statusMap[newOrder.status];
            if (notification) {
                setBanner({
                    isVisible: true,
                    message: notification.message,
                    type: notification.type,
                });
            }
        }
    });
};
const OrderCard = React.memo(({ order, onPress }: { order: Order, onPress: (id: string) => void }) => {
    const statusColor = (status: Order['status']) => {
        switch (status) {
            case 'Allocated': return '#007E6E';
            case 'Delivered': return '#34C759';
            case 'Returned': return '#007AFF';
            case 'Pending':
            default: return '#FF9500'; 
        }
    };

    return (
        <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.8}
            onPress={() => onPress(order.id)}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>{order.equipmentName}</Text>
                <Text style={[styles.statusBadge, { backgroundColor: statusColor(order.status) }]}>
                    {order.status}
                </Text>
            </View>
            <View style={styles.cardDetailRow}>
                <Text style={styles.detailLabel}>Hours:</Text>
                <Text style={styles.detailValue}>{order.bookingHrs} hrs</Text>
            </View>
            <View style={styles.cardDetailRow}>
                <Text style={styles.detailLabel}>Cost:</Text>
                <Text style={styles.costValue}>₹{order.estimatedCost}</Text>
            </View>
            <View style={styles.cardDetailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>{formatOrderDate(order.createdAt)}</Text>
            </View>
        </TouchableOpacity>
    );
});

OrderCard.displayName = 'OrderCard';

export default function RentsScreen() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const prevOrdersRef = useRef<Order[]>([]);
    const [banner, setBanner] = useState({
        isVisible: false,
        message: '',
        type: 'info' as 'success' | 'info',
    });

    const fetchOrders = async () => {
        if (!user?.centerId || !user?.uid) {
            console.log('Missing user data:', { centerId: user?.centerId, uid: user?.uid });
            setOrders([]);
            setIsLoading(false);
            return;
        }

        console.log('Fetching orders for user:', user.uid, 'in center:', user.centerId);
        const ordersCollectionRef = collection(db, `chcCenters/${user.centerId}/orders`);
        const q = query(
            ordersCollectionRef, 
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc') 
        );

        const unsubscribe = onSnapshot(
            q, 
            (snapshot) => {
                console.log('Orders snapshot received, count:', snapshot.docs.length);
                const fetchedOrders: Order[] = snapshot.docs.map(doc => {
                    const data = doc.data();
                    console.log('Order data:', doc.id, data);
                    return {
                        id: doc.id,
                        equipmentName: data.equipmentName || 'Unknown Equipment',
                        bookingHrs: data.bookingHrs || 0,
                        estimatedCost: data.estimatedCost || 0,
                        status: data.status || 'Pending', 
                        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
                    };
                });
                if (!isLoading && prevOrdersRef.current.length > 0) {
                    notifyStatusChange(prevOrdersRef.current, fetchedOrders, setBanner);
                }
                prevOrdersRef.current = fetchedOrders;
                setOrders(fetchedOrders);
                console.log('Fetched orders:', fetchedOrders);
                setOrders(fetchedOrders);
                if(isLoading) setIsLoading(false);
                if(isRefreshing) setIsRefreshing(false);
            }, 
            (error) => {
                console.error("Failed to fetch real-time orders:", error);
                if(isLoading) setIsLoading(false);
                if(isRefreshing) setIsRefreshing(false);
                Alert.alert("Error", "Could not load your orders. " + error.message);
            }
        );

        return unsubscribe;
    };

    useEffect(() => {
        const unsubscribe = fetchOrders();
        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [user?.centerId, user?.uid]);
    
    const handleRefresh = () => {
        setIsRefreshing(true);
    };

    const handleOrderPress = (orderId: string) => {
        console.log('Navigating to order details:', orderId);
        router.push(`/rent/details/${orderId}`);
    };

    if (isLoading) {
        return (
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" color="#007E6E" />
                <Text style={styles.loadingText}>Loading your rental history...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'My Rents' }} />
            <View style={styles.header}>
                <ThemedText type="title" style={styles.title}>Your Orders</ThemedText>
            </View>
            <FlatList
                data={orders}
                renderItem={({ item }) => <OrderCard order={item} onPress={handleOrderPress} />}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.flatListContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor="#007E6E"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.centeredContainer}>
                        <IconSymbol name="cube.box" size={50} color="#999" style={{ marginBottom: 10 }}/>
                        <Text style={styles.emptyText}>You have no current or past rental orders.</Text>
                        <Text style={styles.emptyText}>Go to Dashboard to rent equipment.</Text>
                    </View>
                }
            />
            <BannerNotification
                message={banner.message}
                type={banner.type}
                isVisible={banner.isVisible}
                onClose={() => setBanner({ ...banner, isVisible: false })}
            />
        </View>
    );
}
const bannerStyles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0, 
        left: 0,
        right: 0,
        padding: 15,
        paddingTop: Platform.OS === 'ios' ? 45 : 15, 
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 10,
    },
    messageText: {
        flex: 1,
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    closeButton: {
        marginLeft: 10,
        padding: 5,
    },
});
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E7DEAF',
    },
    centeredContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        minHeight: 200,
    },
    header: {
        backgroundColor: 'white',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#007E6E50',
    },
    title: {
        color: '#007E6E',
        textAlign: 'center',
        fontSize: 24,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#007E6E',
    },
    emptyText: {
        marginTop: 5,
        fontSize: 16,
        color: '#999999',
        textAlign: 'center',
    },
    flatListContent: {
        padding: 10,
    },
    card: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderLeftWidth: 5,
        borderLeftColor: '#007E6E',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        flexShrink: 1,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 15,
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        overflow: 'hidden',
    },
    cardDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 3,
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    costValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#007AFF',
    }
});