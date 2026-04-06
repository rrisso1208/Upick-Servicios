/**
 * Client component for checkout with cart, slots, and payment
 * Rebuilt to fix timezone issues and Wompi widget integration
 * a
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../../components/layout/Header';
import { SlotPicker } from '../../../components/ui/SlotPicker';
import { CouponInput } from '../../../components/ui/CouponInput';
import { InvoiceForm } from '../../../components/ui/InvoiceForm';
import { formatCurrency } from '../../../lib/utils';
import {
  calculateOrderCost,
  calculateRemainingForFreeFee,
  type RestaurantFeeConfig,
} from '../../../lib/order-cost';
import {
  getCart,
  clearCart,
  removeFromCart,
  updateQuantity,
  type CartItem,
} from '../../../lib/cart';
import { supabase } from '../../../providers/AuthProvider';
import {
  ShoppingCart,
  Clock,
  MapPin,
  CreditCard,
  Trash2,
  Plus,
  Minus,
  Wallet,
  Utensils,
  ShoppingBag,
  Truck,
  Search,
  Check,
} from 'lucide-react';
import { WompiWidget } from '../../../components/payments/WompiWidget';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getCSRFTokenForRequest } from '../../../hooks/useCSRFToken';

interface AvailableSlot {
  slotStart: Date;
  slotEnd: Date;
  available: number;
  capacity: number;
}

interface CheckoutClientProps {
  university: {
    id: string;
    name: string;
    slug: string;
  };
}

export function CheckoutClient({ university }: CheckoutClientProps) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [filteredSlots, setFilteredSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Date | undefined>();
  const [pickupMode, setPickupMode] = useState<'ASAP' | 'SCHEDULED'>('SCHEDULED');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discountAmount: number;
  } | null>(null);

  const [slotsRestrictionError, setSlotsRestrictionError] = useState<string | null>(null);

  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [useCredits, setUseCredits] = useState<boolean>(false);
  const [creditsToUse, setCreditsToUse] = useState<number>(0);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [integritySignature, setIntegritySignature] = useState<string | null>(
    null
  );
  const [remainingAmount, setRemainingAmount] = useState<number>(0);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<
    Array<{
      id: string;
      method: 'CARD' | 'PSE';
      wompiPaymentSourceId: string | null;
      last4Digits: string | null;
      brand: string | null;
      bankName: string | null;
      isDefault: boolean;
    }>
  >([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);
  const [useNewPaymentMethod, setUseNewPaymentMethod] = useState(false);
  const [consentToSavePaymentMethod, setConsentToSavePaymentMethod] =
    useState(false);
  const [orderType, setOrderType] = useState<'eat_in' | 'takeout'>('eat_in');
  const [serviceMode, setServiceMode] = useState<'eat_in' | 'takeaway' | 'internal_delivery'>('eat_in');
  const [allowEatIn, setAllowEatIn] = useState(true);
  const [allowTakeout, setAllowTakeout] = useState(true);
  const [allowInternalDelivery, setAllowInternalDelivery] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryPoints, setDeliveryPoints] = useState<Array<{ id: string; name: string; category: string | null }>>([]);
  const [selectedDeliveryPointId, setSelectedDeliveryPointId] = useState<string | null>(null);
  const [deliveryPointSearch, setDeliveryPointSearch] = useState('');
  const [freeFeeThreshold, setFreeFeeThreshold] = useState(0); // In cents
  const [takeoutFee, setTakeoutFee] = useState(0);
  const [lowOrderFee, setLowOrderFee] = useState(0); // In cents
  const [restaurantType, setRestaurantType] = useState<string>('RESTAURANT');
  const [tables, setTables] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [acceptanceToken, setAcceptanceToken] = useState<string | undefined>();
  const [wompiPublicKey, setWompiPublicKey] = useState<string | null>(null);
  const [user, setUser] = useState<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    documentType: string | null;
    documentNumber: string | null;
    invoiceData?: {
      documentType: string;
      documentNumber: string;
    } | null;
  } | null>(null);



  // Validation logic for Wompi data
  // Convert to boolean explicitly to avoid returning the actual value
  const hasProfileData = !!(
    user?.phoneNumber &&
    (user?.documentNumber || user?.invoiceData?.documentNumber) &&
    (user?.documentType || user?.invoiceData?.documentType)
  );
  const hasInvoiceData = !!(
    invoiceData?.phone &&
    invoiceData?.documentNumber &&
    invoiceData?.documentType
  );

  // Valid if NOT saving, OR if saving and we have data from somewhere
  const isWompiDataValid = !consentToSavePaymentMethod || hasProfileData || hasInvoiceData;

  const buildCustomerData = () => {
    const email = (invoiceData?.email || user?.email || '').trim();
    const businessName = (invoiceData?.businessName || '').trim();
    const fullName = businessName
      ? businessName
      : user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : '';
    const phoneNumberRaw = user?.phoneNumber || invoiceData?.phone || '';
    const phoneNumber = phoneNumberRaw.replace(/\D/g, '').trim();
    const legalId =
      (user?.documentNumber ||
        user?.invoiceData?.documentNumber ||
        invoiceData?.documentNumber ||
        '')
        .trim();
    const legalIdType =
      user?.documentType || user?.invoiceData?.documentType || invoiceData?.documentType;
    const shouldIncludeLegalId = Boolean(legalId && legalIdType);

    const customerData = {
      ...(email ? { email } : {}),
      ...(fullName ? { fullName } : {}),
      ...(phoneNumber ? { phoneNumber } : {}),
      ...(phoneNumber ? { phoneNumberPrefix: '+57' } : {}),
      ...(shouldIncludeLegalId ? { legalId, legalIdType } : {}),
    };

    return Object.keys(customerData).length > 0 ? customerData : undefined;
  };

  // Debug log
  useEffect(() => {
    if (consentToSavePaymentMethod) {
      console.log('Wompi Validation:', {
        consentToSavePaymentMethod,
        hasProfileData,
        hasInvoiceData,
        isWompiDataValid,
        userPhoneNumber: user?.phoneNumber,
        userDocumentNumber: user?.documentNumber,
        invoiceDataPhone: invoiceData?.phone,
        invoiceDataDocument: invoiceData?.documentNumber,
      });
    }
  }, [consentToSavePaymentMethod, hasProfileData, hasInvoiceData, isWompiDataValid, user, invoiceData]);

  useEffect(() => {
    // Load cart
    const cartData = getCart(university.slug);
    if (cartData.length === 0) {
      router.push(`/${university.slug}`);
      return;
    }
    setCart(cartData);

    // Fetch restaurant and slots
    fetchRestaurantData(cartData[0].restaurantId, cartData);

    // Fetch user credits
    fetchUserCredits();

    // Fetch saved payment methods
    fetchSavedPaymentMethods();

    // Fetch Wompi acceptance token
    fetchAcceptanceToken();

    // Fetch Wompi public key from API if not available in process.env
    fetchWompiPublicKey();

    // Fetch user profile
    fetchUserProfile();
  }, []);

  // Filter out past slots and slots from previous days
  // Uses Colombia timezone (America/Bogota, UTC-5)
  useEffect(() => {
    if (slots.length === 0) {
      setFilteredSlots([]);
      return;
    }

    // Colombia timezone offset: UTC-5 = -5 hours = -300 minutes
    const COLOMBIA_OFFSET_MS = -5 * 60 * 60 * 1000; // -18000000 ms

    // Get current UTC time
    const utcNow = Date.now();
    // Convert to Colombia time representation
    const colombiaNowMs = utcNow + COLOMBIA_OFFSET_MS;
    const colombiaNow = new Date(colombiaNowMs);

    // Add 30 minutes buffer for preparation time (in Colombia time)
    const cutoffTimeColombia = colombiaNowMs + 30 * 60 * 1000;
    // Convert back to UTC for comparison with slot times (which are in UTC)
    const cutoffTimeUTC = cutoffTimeColombia - COLOMBIA_OFFSET_MS;

    // Get start of today in Colombia timezone (midnight Colombia time)
    const colombiaToday = new Date(
      colombiaNow.getUTCFullYear(),
      colombiaNow.getUTCMonth(),
      colombiaNow.getUTCDate(),
      0,
      0,
      0,
      0
    );
    // Convert to UTC timestamp for comparison
    const todayStartColombia = colombiaToday.getTime();
    const todayStartUTC = todayStartColombia - COLOMBIA_OFFSET_MS;

    // Debug: Log current Colombia time and cutoff
    console.log(
      `[Slot Filter] Colombia Now: ${colombiaNow.toLocaleString('es-CO', { timeZone: 'America/Bogota' })} | Cutoff UTC: ${new Date(cutoffTimeUTC).toISOString()} | Today Start UTC: ${new Date(todayStartUTC).toISOString()} | Total slots: ${slots.length}`
    );

    const filtered = slots.filter((slot) => {
      // Convert slotStart to Date if it's a string
      const slotStartDate =
        slot.slotStart instanceof Date
          ? slot.slotStart
          : new Date(slot.slotStart);

      const slotTimeUTC = slotStartDate.getTime();

      // Convert slot time to Colombia timezone to check the date
      const slotTimeColombia = slotTimeUTC + COLOMBIA_OFFSET_MS;
      const slotDateColombia = new Date(slotTimeColombia);
      const slotDateOnlyColombia = new Date(
        slotDateColombia.getUTCFullYear(),
        slotDateColombia.getUTCMonth(),
        slotDateColombia.getUTCDate(),
        0,
        0,
        0,
        0
      );
      const slotDateOnlyUTC =
        slotDateOnlyColombia.getTime() - COLOMBIA_OFFSET_MS;

      // Only show slots that are:
      // 1. From today or future days (not from previous days) - using Colombia timezone
      // 2. In the future (with buffer) - comparing slot times directly
      const isTodayOrFuture = slotDateOnlyUTC >= todayStartUTC;
      const isInFuture = slotTimeUTC > cutoffTimeUTC;

      // Debug logging (always show for debugging)
      const slotColombiaStr = slotDateColombia.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
      });
      const nowColombiaStr = colombiaNow.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
      });
      console.log(
        `[Slot Filter] Slot: ${slotColombiaStr} | Now: ${nowColombiaStr} | isTodayOrFuture: ${isTodayOrFuture} | isInFuture: ${isInFuture} | Show: ${isTodayOrFuture && isInFuture}`
      );

      return isTodayOrFuture && isInFuture;
    });

    setFilteredSlots(filtered);

    // If selected slot is now in the past or from a previous day, clear it
    if (selectedSlot) {
      const selectedDate =
        selectedSlot instanceof Date ? selectedSlot : new Date(selectedSlot);

      const selectedTimeUTC = selectedDate.getTime();
      const selectedTimeColombia = selectedTimeUTC + COLOMBIA_OFFSET_MS;
      const selectedDateColombia = new Date(selectedTimeColombia);
      const selectedDateOnlyColombia = new Date(
        selectedDateColombia.getUTCFullYear(),
        selectedDateColombia.getUTCMonth(),
        selectedDateColombia.getUTCDate(),
        0,
        0,
        0,
        0
      );
      const selectedDateOnlyUTC =
        selectedDateOnlyColombia.getTime() - COLOMBIA_OFFSET_MS;

      const isFromPastDay = selectedDateOnlyUTC < todayStartUTC;
      const isInPast = selectedTimeUTC <= cutoffTimeUTC;

      if (isFromPastDay || isInPast) {
        setSelectedSlot(undefined);
      }
    }
  }, [slots, selectedSlot]);

  const fetchUserCredits = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch('/api/student/credits', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        setUserCredits(data.data.balance);
        // Auto-set credits to use if user has credits
        if (data.data.balance > 0) {
          // currentCartTotal is already in cents (unitPrice is in cents)
          const currentCartTotal = cart.reduce((sum, item) => {
            const itemPrice = item.unitPrice * item.quantity;
            const optionsPrice = (item.options || []).reduce(
              (optSum, opt) => optSum + opt.priceDelta * item.quantity,
              0
            );
            return sum + itemPrice + optionsPrice;
          }, 0);
          // discountAmount is in cents, so totalAfterCoupon is also in cents
          const totalAfterCoupon = Math.max(
            0,
            currentCartTotal - (appliedCoupon?.discountAmount || 0)
          );
          // creditsToUse is in cents, so no need to multiply
          setCreditsToUse(Math.min(data.data.balance, totalAfterCoupon));
        }
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const fetchSavedPaymentMethods = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch('/api/student/payment-methods', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        const methods = data.data.methods.filter(
          (m: any) => m.wompiPaymentSourceId // Only show methods that can be used
        );
        setSavedPaymentMethods(methods);

        // Auto-select default method if available
        const defaultMethod = methods.find((m: any) => m.isDefault);
        if (defaultMethod) {
          setSelectedPaymentMethodId(defaultMethod.id);
          setUseNewPaymentMethod(false);
        } else if (methods.length > 0) {
          // If no default, select first one
          setSelectedPaymentMethodId(methods[0].id);
          setUseNewPaymentMethod(false);
        }
      }
    } catch (error) {
      console.error('Error fetching saved payment methods:', error);
    }
  };

  const fetchRestaurantData = async (restaurantId: string, cartData: CartItem[]) => {
    try {
      setRestaurant({
        id: restaurantId,
        name: cartData[0]?.restaurantName || 'Restaurante',
      });

      setSlotsRestrictionError(null);

      const productIds = Array.from(
        new Set(cartData.map((i) => i.productId).filter(Boolean))
      );
      const productIdsParam = encodeURIComponent(productIds.join(','));

      // Fetch available slots (ya vienen filtrados por horarios de categorías del carrito)
      const resSlots = await fetch(
        `/api/restaurants/by-id/${restaurantId}/slots?productIds=${productIdsParam}`,
        { credentials: 'include' }
      );

      const dataSlots = await resSlots.json();

      if (dataSlots.success) {
        if (dataSlots.data?.restrictions?.noIntersection) {
          setSlots([]);
          setFilteredSlots([]);
          setSelectedSlot(undefined);
          setSlotsRestrictionError(
            'Tu carrito tiene productos con horarios de recogida incompatibles. Ajusta tu carrito para poder elegir una hora.'
          );
        } else {
          const parsedSlots = dataSlots.data.slots.map((s: any) => ({
            ...s,
            slotStart: new Date(s.slotStart),
            slotEnd: new Date(s.slotEnd),
          }));
          setSlots(parsedSlots);
        }

        // Set orderTypeMode, allowTakeout, delivery config, and service fee config from restaurant config
        if (dataSlots.data.restaurant) {
          const allowEatIn = dataSlots.data.restaurant.allowEatIn ?? true;
          const allowTakeout = dataSlots.data.restaurant.allowTakeout ?? true;
          const allowInternalDelivery = dataSlots.data.restaurant.allowInternalDelivery ?? false;
          const fee = dataSlots.data.restaurant.deliveryFee ?? 0;
          const threshold = dataSlots.data.restaurant.freeFeeThreshold ?? 0;
          const serviceFee = dataSlots.data.restaurant.lowOrderFee ?? 0;
          const takeout = dataSlots.data.restaurant.takeoutFee ?? 0;

          setAllowEatIn(allowEatIn);
          setAllowTakeout(allowTakeout);
          setAllowInternalDelivery(allowInternalDelivery);
          setDeliveryFee(fee);
          setFreeFeeThreshold(threshold);
          setLowOrderFee(serviceFee);
          setTakeoutFee(takeout);
          setRestaurantType(dataSlots.data.restaurant.type || 'RESTAURANT');
          setTables(dataSlots.data.restaurant.tables || []);
        }

        // Fetch delivery points for this place (university)
        if (university.id) {
          fetchDeliveryPoints(university.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch restaurant data:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const fetchAcceptanceToken = async () => {
    try {
      console.log('Fetching acceptance token from /api/payments/wompi-merchants...');
      const response = await fetch('/api/payments/wompi-merchants', {
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('Failed to fetch acceptance token:', {
          status: response.status,
          statusText: response.statusText,
        });
        return;
      }

      const data = await response.json();
      if (data.success && data.data?.acceptanceToken) {
        setAcceptanceToken(data.data.acceptanceToken);
        console.log('✅ Acceptance token obtained successfully:', {
          tokenPrefix: data.data.acceptanceToken.substring(0, 20) + '...',
          permalink: data.data.permalink,
          type: data.data.type,
        });
      } else {
        console.error('❌ Failed to get acceptance token:', {
          success: data.success,
          error: data.error,
          hasData: !!data.data,
          hasAcceptanceToken: !!data.data?.acceptanceToken,
        });
        // Don't block payment if acceptance token fails - tokenization just won't work
        // But log it for debugging
      }
    } catch (error) {
      console.error('❌ Error fetching acceptance token:', error);
      // Don't block payment if acceptance token fails - tokenization just won't work
    }
  };

  const optionsCount =
    (allowEatIn ? 1 : 0) +
    (allowTakeout ? 1 : 0) +
    (allowInternalDelivery ? 1 : 0);

  const fetchWompiPublicKey = async () => {
    // First check if it's available in process.env (build-time)
    const envKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
    if (envKey && envKey.trim() !== '' && envKey !== 'undefined') {
      setWompiPublicKey(envKey);
      return;
    }

    // If not available, fetch from API
    try {
      const response = await fetch('/api/payments/public-key', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.publicKey) {
        setWompiPublicKey(data.publicKey);
        console.log('Wompi public key fetched from API');
      } else {
        console.error('Failed to fetch Wompi public key from API:', data.error);
      }
    } catch (error) {
      console.error('Error fetching Wompi public key:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch('/api/student/profile', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        setUser(data.data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchDeliveryPoints = async (placeId: string) => {
    try {
      const response = await fetch(`/api/delivery-points?placeId=${placeId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setDeliveryPoints(data.data.points || []);
      }
    } catch (error) {
      console.error('Error fetching delivery points:', error);
    }
  };

  const handleRemoveItem = (
    productId: string,
    options?: CartItem['options']
  ) => {
    removeFromCart(university.slug, productId, options);
    const updatedCart = getCart(university.slug);
    setCart(updatedCart);

    // If cart is empty, redirect to home
    if (updatedCart.length === 0) {
      router.push(`/${university.slug}`);
      return;
    }

    // Update credits if needed
    if (useCredits && userCredits > 0) {
      const newCartSubtotal = updatedCart.reduce((sum, item) => {
        const itemPrice = item.unitPrice * item.quantity;
        const optionsPrice = (item.options || []).reduce(
          (optSum, opt) => optSum + opt.priceDelta * item.quantity,
          0
        );
        return sum + itemPrice + optionsPrice;
      }, 0);
      const newTotalAfterCoupon = Math.max(0, newCartSubtotal - (appliedCoupon?.discountAmount || 0));
      setCreditsToUse(Math.min(userCredits, newTotalAfterCoupon));
    }

    window.dispatchEvent(new Event('cart-updated'));
  };

  const handleUpdateQuantity = (
    productId: string,
    newQuantity: number,
    options?: CartItem['options'],
    notes?: string
  ) => {
    updateQuantity(university.slug ,productId, newQuantity, options, notes);
    const updatedCart = getCart(university.slug);
    setCart(updatedCart);

    // Update credits if needed
    if (useCredits && userCredits > 0) {
      const newCartSubtotal = updatedCart.reduce((sum, item) => {
        const itemPrice = item.unitPrice * item.quantity;
        const optionsPrice = (item.options || []).reduce(
          (optSum, opt) => optSum + opt.priceDelta * item.quantity,
          0
        );
        return sum + itemPrice + optionsPrice;
      }, 0);
      const newTotalAfterCoupon = Math.max(0, newCartSubtotal - (appliedCoupon?.discountAmount || 0));
      setCreditsToUse(Math.min(userCredits, newTotalAfterCoupon));
    }

    window.dispatchEvent(new Event('cart-updated'));
  };

  const cartSubtotal = cart.reduce((sum, item) => {
    const itemPrice = item.unitPrice * item.quantity;
    const optionsPrice = (item.options || []).reduce(
      (optSum, opt) => optSum + opt.priceDelta * item.quantity,
      0
    );
    return sum + itemPrice + optionsPrice;
  }, 0);

  const discountAmount = appliedCoupon?.discountAmount || 0;

  // Calculate service fee using the utility function
  // IMPORTANT: Service fee is calculated on subtotal BEFORE discount
  // This ensures users are incentivized to reach the threshold
  const restaurantFeeConfig: RestaurantFeeConfig = {
    freeFeeThreshold,
    lowOrderFee,
    deliveryFee,
  };

  const orderItems = cart.map((item) => ({
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    options: (item.options || []).map((opt) => ({
      priceDelta: opt.priceDelta,
    })),
  }));

  // Calculate cost breakdown (service fee is based on subtotal, not after discount)
  const costBreakdown = calculateOrderCost(
    orderItems,
    restaurantFeeConfig,
    serviceMode
  );

  const takeoutFeeAmount =
    serviceMode === 'takeaway' ? takeoutFee : 0;

  const serviceFeeAmount = costBreakdown.serviceFee;
  const deliveryCostInCents = costBreakdown.deliveryCost;

  // Calculate total: subtotal - discount + service fee + delivery
  // cartSubtotal is already in cents (product.price is in cents)
  // discountAmount is in cents
  // deliveryCostInCents is in cents
  // serviceFeeAmount is in cents
  const cartTotalBeforeCredits = Math.max(
    0,
    cartSubtotal -
    discountAmount +
    serviceFeeAmount +
    deliveryCostInCents +
    takeoutFeeAmount
  );
  const creditsAmountInCents = useCredits
    ? Math.min(creditsToUse, userCredits, cartTotalBeforeCredits)
    : 0;
  // cartTotalInCents is the final amount in cents (for Wompi)
  const cartTotalInCents = Math.max(
    0,
    cartTotalBeforeCredits - creditsAmountInCents
  );

  const handleCheckout = async () => {
    if (pickupMode === 'SCHEDULED' && !selectedSlot) {
      alert('Por favor selecciona una franja de recogida');
      return;
    }

    if (missingRequiredInfo) {
      setPaymentError(missingInfoMessage);
      setLoading(false);

      // Opcional: scrollear al resumen donde aparece el error
      setTimeout(() => {
        const paymentSection = document.getElementById('payment-section');
        if (paymentSection) {
          paymentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 150);

      return;
    }

    if (!restaurant) {
      alert('Error: Información del restaurante no disponible');
      return;
    }

    // Validate table selection if eat_in is selected for DISCOTECA
    if (serviceMode === 'eat_in' && restaurantType === 'DISCOTECA' && !selectedTableId) {
      alert('Por favor selecciona una mesa para llevar tu pedido');
      return;
    }

    // Validate delivery point if internal_delivery is selected
    if (serviceMode === 'internal_delivery' && !selectedDeliveryPointId) {
      alert('Por favor selecciona un punto de entrega para el domicilio');
      return;
    }

    // Validate customer phone for internal_delivery
    if (serviceMode === 'internal_delivery' && !user?.phoneNumber && !invoiceData?.phone) {
      alert('Por favor ingresa tu número de teléfono en tu perfil o en los datos de facturación para el domicilio');
      return;
    }

    setLoading(true);
    setPaymentError(null);

    try {
      // Get session token for authentication
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!session || !session.access_token) {
        alert('Por favor inicia sesión para realizar un pedido');
        router.push(
          `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`
        );
        setLoading(false);
        return;
      }

      // Get CSRF token for the request
      // Fetch with credentials to ensure cookies are sent
      const csrfToken = await getCSRFTokenForRequest();
      if (!csrfToken) {
        throw new Error('No se pudo obtener el token de seguridad. Por favor recarga la página.');
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        'X-CSRF-Token': csrfToken,
      };

      // Debug log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('CSRF Token obtained:', csrfToken.substring(0, 10) + '...');
      }

      // 1. Create order
      if (!selectedSlot) {
        throw new Error('No hay franja válida seleccionada');
      }

      const desiredSlotISO = selectedSlot.toISOString();

      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          universityId: university.id, // Required: placeId
          restaurantId: restaurant.id,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes || undefined,
            options: (item.options || []).map((opt) => ({
              productOptionId: opt.productOptionId,
              priceDelta: opt.priceDelta,
            })),
          })),
          desiredSlot: desiredSlotISO,
          couponCode: appliedCoupon?.code, // Optional string, not null
          invoiceData: invoiceData || undefined,
          needsInvoice: !!invoiceData, // Mark order as needing invoice if invoiceData exists
          invoiceDataId: invoiceData?.id || undefined, // Send saved invoice data ID if available
          creditsToUse: useCredits ? creditsAmountInCents : 0,
          consentToSavePaymentMethod: consentToSavePaymentMethod, // Consentimiento Ley 1581
          orderType,
          serviceMode,
          deliveryPointId: serviceMode === 'internal_delivery' ? selectedDeliveryPointId : undefined,
          tableId: (serviceMode === 'eat_in' && restaurantType === 'DISCOTECA') ? selectedTableId : undefined,
          deliveryCost: serviceMode === 'internal_delivery' ? deliveryCostInCents : 0,
          serviceFeeAmount: serviceFeeAmount, // Service fee amount
          customerPhone: serviceMode === 'internal_delivery'
            ? (user?.phoneNumber || invoiceData?.phone || '')
            : undefined,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.error || 'Error al crear el pedido');
      }

      const newOrderId = orderData.data?.id;
      if (!newOrderId || typeof newOrderId !== 'string') {
        throw new Error('Order created but no ID returned from server');
      }

      setOrderId(newOrderId);

      // Save orderId to localStorage so we can access it even if session expires
      // This is critical for payment result page access
      localStorage.setItem('lastOrderId', newOrderId);
      localStorage.setItem('pendingOrderId', newOrderId);

      // Calculate remaining amount after credits (in cents)
      // cartTotalBeforeCredits is already in cents, creditsAmountInCents is also in cents
      const calculatedRemainingAmount = Math.max(
        0,
        cartTotalBeforeCredits - creditsAmountInCents
      );

      // Store remainingAmount in state so it's available for the widget
      setRemainingAmount(calculatedRemainingAmount);

      // CRITICAL: If fully paid with credits, we MUST call payment session
      // to deduct credits and mark order as paid
      if (calculatedRemainingAmount === 0 && creditsAmountInCents > 0) {
        // Call payment session to process credits (even though remaining is 0)
        // This will deduct credits and mark order as paid
        const paymentSessionResponse = await fetch('/api/payments/session', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            orderId: newOrderId,
            method: 'CARD', // Method doesn't matter when fully paid with credits
            creditsToUse: creditsAmountInCents,
            paymentData: undefined, // No payment data needed for credit-only payment
          }),
        });

        const paymentSessionData = await paymentSessionResponse.json();

        if (!paymentSessionData.success) {
          throw new Error(
            paymentSessionData.error || 'Error al procesar el pago con créditos'
          );
        }

        // Verify that payment was processed with credits
        if (!paymentSessionData.data?.paidWithCredits) {
          throw new Error(
            'El pago con créditos no se procesó correctamente. Por favor intenta nuevamente.'
          );
        }

        // Credits processed successfully, redirect to receipt
        clearCart(university.slug);
        router.push(`/orders/${newOrderId}/receipt`);
        setLoading(false);
        return;
      }

      // Get selected payment method if using saved method
      const selectedMethod = savedPaymentMethods.find(
        (m) => m.id === selectedPaymentMethodId && !useNewPaymentMethod
      );

      // If using saved payment method, process payment directly
      if (selectedMethod && selectedMethod.wompiPaymentSourceId) {
        const paymentResponse = await fetch(
          '/api/payments/process-saved-method',
          {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
              orderId: newOrderId,
              paymentMethodId: selectedMethod.id,
            }),
          }
        );

        const paymentData = await paymentResponse.json();
        if (paymentData.success) {
          // Payment processed, redirect to payment result
          clearCart(university.slug);
          router.push(`/orders/${newOrderId}/payment-result`);
          setLoading(false);
          return;
        } else {
          throw new Error(
            paymentData.error || 'Error al procesar el pago con método guardado'
          );
        }
      }

      // Otherwise, use widget for new payment method
      // Get integrity signature for widget
      const signatureResponse = await fetch(
        `/api/payments/integrity-signature?orderId=${newOrderId}&amountInCents=${calculatedRemainingAmount}`,
        {
          headers,
          credentials: 'include',
        }
      );

      // Check if response is ok before parsing JSON
      if (!signatureResponse.ok) {
        let errorData;
        try {
          errorData = await signatureResponse.json();
        } catch {
          errorData = {
            error: 'Error desconocido del servidor',
            details: `HTTP ${signatureResponse.status}: ${signatureResponse.statusText}`,
          };
        }

        console.error('Failed to get integrity signature:', {
          status: signatureResponse.status,
          statusText: signatureResponse.statusText,
          error: errorData,
        });

        // Show user-friendly error message
        const errorMessage =
          errorData.code === 'MISSING_INTEGRITY_SECRET'
            ? 'Error de configuración: Falta configurar WOMPI_INTEGRITY_SECRET en Vercel. Por favor contacta al administrador.'
            : errorData.details ||
            errorData.error ||
            'Error al generar la firma de pago';

        throw new Error(errorMessage);
      }

      const signatureData = await signatureResponse.json();
      if (signatureData.success) {
        console.log('Integrity signature obtained successfully', {
          orderId: newOrderId,
          signatureLength: signatureData.data.integritySignature?.length,
        });
        setIntegritySignature(signatureData.data.integritySignature);
        setOrderId(newOrderId);
        setLoading(false);
        // Widget will be rendered and should auto-open
        // Scroll to payment section after a short delay
        setTimeout(() => {
          const paymentSection = document.getElementById('payment-section');
          if (paymentSection) {
            paymentSection.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }
        }, 300);
        return;
      } else {
        console.error('Failed to get integrity signature:', signatureData);
        throw new Error(
          signatureData.error ||
          signatureData.details ||
          'Error al generar la firma de pago'
        );
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      setPaymentError(
        error instanceof Error
          ? error.message
          : 'Error al procesar el pedido. Por favor intenta de nuevo.'
      );
      setLoading(false);
    }
  };

  const missingRequiredInfo =
    !(
      (user?.phoneNumber || invoiceData?.phone) &&
      (user?.documentNumber ||
        user?.invoiceData?.documentNumber ||
        invoiceData?.documentNumber)
    );

  const missingInfoMessage =
    'Completa tu información (teléfono y documento) para realizar la compra. Ve a Configuración.';


  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <ShoppingCart className="mx-auto h-16 w-16 text-gray-400" />
            <h2 className="mt-4 text-xl font-semibold text-gray-700">
              Tu carrito está vacío
            </h2>
            <button
              onClick={() => router.push(`/${university.slug}`)}
              className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              Volver a restaurantes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto w-full max-w-screen-lg px-3 sm:px-4 py-6 overflow-x-hidden pb-24">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          Finalizar Pedido
        </h1>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 min-w-0 max-w-full">
          {/* Left Column - Form */}
          <div className="space-y-6 lg:col-span-2">
            {/* Invoice Form */}
            <div className="card">
              <InvoiceForm
                onDataChange={(data) => setInvoiceData(data)}
                initialData={invoiceData}
              />
            </div>

            {/* Service Fee Banner */}
            {freeFeeThreshold > 0 && (
              <div className="card w-full max-w-full overflow-hidden">
                {(() => {
                  const subtotalForProgress = Math.max(0, cartSubtotal - discountAmount);
                  const remaining = calculateRemainingForFreeFee(cartSubtotal, freeFeeThreshold);
                  const hasReachedThreshold = remaining === 0;

                  return (
                    <div
                      className={`rounded-lg p-4 max-w-full overflow-hidden ${
                        hasReachedThreshold
                          ? 'bg-green-50 border-2 border-green-200'
                          : 'bg-blue-50 border-2 border-blue-200'
                      }`}
                    >
                      {hasReachedThreshold ? (
                        <div className="flex items-center gap-2 text-green-800">
                          <Check className="h-5 w-5 text-green-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-green-900 break-words">
                              ¡Genial! Tu costo de servicio es GRATIS
                            </p>
                            <p className="mt-1 text-sm text-green-700 break-words">
                              Has superado el monto mínimo de {formatCurrency(freeFeeThreshold)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-blue-800">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-blue-900 break-words">
                              ¡Te faltan {formatCurrency(remaining)} para que el Costo de Servicio sea GRATIS!
                            </p>

                            <div className="mt-2">
                              <div className="mb-1 flex flex-col gap-0.5 text-xs text-blue-700 sm:flex-row sm:items-center sm:justify-between">
                                <span className="shrink-0">Progreso hacia el mínimo</span>
                                <span className="min-w-0 break-words sm:text-right">
                      {formatCurrency(cartSubtotal)}{' '}
                                  <span className="opacity-70">/</span>{' '}
                                  {formatCurrency(freeFeeThreshold)}
                    </span>
                              </div>

                              <div className="w-full max-w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.min(100, (cartSubtotal / freeFeeThreshold) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>

                            <p className="mt-2 text-xs text-blue-600 break-words">
                              Agrega más productos para evitar el costo de servicio de {formatCurrency(lowOrderFee)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Service Mode Selector */}
            <div className="card">
              <div className="mb-4 flex items-center gap-2 border-b pb-4">
                <Utensils className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-semibold">¿Cómo quieres tu pedido?</h3>
              </div>

              <div
                className={`grid gap-3 sm:gap-4 ${
                  optionsCount === 1
                    ? 'grid-cols-1'
                    : optionsCount === 2
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : 'grid-cols-1 sm:grid-cols-3'
                }`}
              >
                {/* Comer Aquí */}
                {allowEatIn && (
                  <button
                    onClick={() => {
                      setOrderType('eat_in');
                      setServiceMode('eat_in');
                      setSelectedDeliveryPointId(null);
                    }}
                    className={`flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 sm:p-4 transition-all ${
                      serviceMode === 'eat_in'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <Utensils className="h-7 w-7 sm:h-8 sm:w-8" />
                    <span className="text-center text-sm font-medium sm:text-base break-words">
                      {restaurantType === 'DISCOTECA' ? 'Llevar a la mesa' : 'Comer aquí'}
                    </span>
                    <span className="text-xs text-gray-500">
                      $0
                    </span>
                  </button>
                )}

                {/* Para Llevar */}
                {allowTakeout && (
                  <button
                    onClick={() => {
                      setOrderType('takeout');
                      setServiceMode('takeaway');
                      setSelectedDeliveryPointId(null);
                    }}
                    className={`flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 sm:p-4 transition-all ${
                      serviceMode === 'takeaway'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <ShoppingBag className="h-8 w-8" />
                    <span className="text-center text-sm font-medium sm:text-base break-words">
                      {restaurantType === 'DISCOTECA' ? 'Recoger en barra' : 'Para llevar'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {takeoutFee > 0 ? formatCurrency(takeoutFee) : '$0'}
                    </span>
                  </button>
                )}

                {/* Domicilio */}
                {allowInternalDelivery && (
                  <button
                    onClick={() => {
                      setOrderType('takeout');
                      setServiceMode('internal_delivery');
                      setSelectedDeliveryPointId(null);
                    }}
                    className={`flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 sm:p-4 transition-all ${
                      serviceMode === 'internal_delivery'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <Truck className="h-8 w-8" />
                    <span className="text-center text-sm font-medium sm:text-base break-words">
                      Domicilio interno
                    </span>
                    <span className="text-xs text-gray-500">
                      {deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Gratis'}
                    </span>
                  </button>
                )}
              </div>

              {/* Table Selector - Only for Discoteca Llevar a la mesa */}
              {serviceMode === 'eat_in' && restaurantType === 'DISCOTECA' && (
                <div className="mt-4 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Selecciona tu mesa <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {tables.map((table) => (
                      <button
                        key={table.id}
                        onClick={() => setSelectedTableId(table.id)}
                        className={`rounded-lg border-2 py-2 px-1 text-sm font-medium transition-all ${
                          selectedTableId === table.id
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        {table.name}
                      </button>
                    ))}
                  </div>
                  {tables.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No hay mesas configuradas. Contacta al personal.
                    </p>
                  )}
                  {!selectedTableId && tables.length > 0 && (
                    <p className="text-xs text-red-600">
                      Debes seleccionar una mesa para continuar
                    </p>
                  )}
                </div>
              )}

              {/* Delivery Point Selector - Only show if internal_delivery is selected */}
              {serviceMode === 'internal_delivery' && (
                <div className="mt-4 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Punto de Entrega <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={deliveryPointSearch}
                      onChange={(e) => setDeliveryPointSearch(e.target.value)}
                      placeholder="Buscar punto de entrega..."
                      className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                    {deliveryPoints
                      .filter((point) =>
                        point.name.toLowerCase().includes(deliveryPointSearch.toLowerCase()) ||
                        (point.category && point.category.toLowerCase().includes(deliveryPointSearch.toLowerCase()))
                      )
                      .map((point) => (
                        <button
                          key={point.id}
                          onClick={() => setSelectedDeliveryPointId(point.id)}
                          className={`w-full rounded-lg p-3 text-left transition-colors ${
                            selectedDeliveryPointId === point.id
                              ? 'bg-primary-50 text-primary-700'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium break-words">{point.name}</div>
                              {point.category && (
                                <div className="text-xs text-gray-500 break-words">{point.category}</div>
                              )}
                            </div>
                            {selectedDeliveryPointId === point.id && (
                              <Check className="h-5 w-5 text-primary-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    {deliveryPoints.filter((point) =>
                      point.name.toLowerCase().includes(deliveryPointSearch.toLowerCase()) ||
                      (point.category && point.category.toLowerCase().includes(deliveryPointSearch.toLowerCase()))
                    ).length === 0 && (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No se encontraron puntos de entrega
                      </div>
                    )}
                  </div>
                  {!selectedDeliveryPointId && serviceMode === 'internal_delivery' && (
                    <p className="text-xs text-red-600">
                      Debes seleccionar un punto de entrega para continuar
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Slot Selection */}
            <div className="card w-full max-w-full overflow-hidden">
              <div className="mb-4 flex items-center gap-2 border-b pb-4">
                <Clock className="h-5 w-5 text-primary-600 shrink-0" />
                <h3 className="text-lg font-semibold">Hora de Recogida</h3>
              </div>

              {slotsRestrictionError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {slotsRestrictionError}
                </div>
              )}

              {loadingSlots ? (
                <div className="rounded-lg bg-gray-50 py-8 text-center text-sm text-gray-600">
                  Cargando horarios disponibles...
                </div>
              ) : filteredSlots.length === 0 ? (
                <div className="rounded-lg bg-gray-50 py-8 text-center text-sm text-gray-600">
                  No hay horarios disponibles en este momento
                </div>
              ) : (
                <div className="max-w-full sm:overflow-visible">
                  <div className="min-w-0">
                    <SlotPicker
                      slots={slots}
                      pickupMode={pickupMode}
                      selectedSlot={selectedSlot}
                      onSelect={(slotStart) => {
                        setPickupMode('SCHEDULED');
                        setSelectedSlot(slotStart);
                      }}
                      onSelectAsap={() => {
                        setPickupMode('ASAP');

                        const firstAvailable = filteredSlots.find((s) => s.available > 0);
                        if (firstAvailable) {
                          setSelectedSlot(firstAvailable.slotStart);
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method Selection */}
            {!orderId && (
              <div className="card w-full max-w-full overflow-hidden">
                <div className="mb-4 flex items-center gap-2 border-b pb-4">
                  <CreditCard className="h-5 w-5 text-primary-600" />
                  <h3 className="text-lg font-semibold">Método de pago</h3>
                </div>

                {/* Saved Payment Methods */}
                {savedPaymentMethods.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-3 text-sm font-medium text-gray-700">
                      Métodos guardados:
                    </p>
                    <div className="space-y-2">
                      {savedPaymentMethods.map((method) => {
                        const displayName =
                          method.method === 'CARD'
                            ? `${method.brand || 'Tarjeta'} •••• ${method.last4Digits || '****'
                            }`
                            : method.bankName
                              ? `PSE - ${method.bankName}`
                              : 'PSE - Débito bancario';
                        return (
                          <label
                            key={method.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all ${selectedPaymentMethodId === method.id &&
                            !useNewPaymentMethod
                              ? 'border-primary-600 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="paymentMethod"
                              checked={
                                selectedPaymentMethodId === method.id &&
                                !useNewPaymentMethod
                              }
                              onChange={() => {
                                setSelectedPaymentMethodId(method.id);
                                setUseNewPaymentMethod(false);
                              }}
                              className="h-4 w-4 text-primary-600"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CreditCard className="h-4 w-4 text-gray-600 shrink-0" />
                                <span className="font-medium break-words">
                                  {displayName}
                                </span>
                                {method.isDefault && (
                                  <span className="badge badge-success text-xs shrink-0">
                                    Predeterminado
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Option to use new payment method */}
                <div className="mt-4">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-gray-200 p-3 transition-all hover:border-gray-300">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={useNewPaymentMethod}
                      onChange={() => {
                        setUseNewPaymentMethod(true);
                        setSelectedPaymentMethodId(null);
                      }}
                      className="h-4 w-4 text-primary-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-gray-600" />
                        <span className="font-medium break-words">
                          Usar un método de pago nuevo
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Ingresarás los datos de tu tarjeta o seleccionarás PSE
                      </p>
                    </div>
                  </label>
                </div>

                {/* Consent to Save Payment Method (Ley 1581 de 2012) */}
                {false && useNewPaymentMethod && (
                  <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={consentToSavePaymentMethod}
                        disabled={loading}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setConsentToSavePaymentMethod(isChecked);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          Guardar este método de pago para futuras compras
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          Al marcar esta casilla, autorizas a Upick a guardar de
                          forma segura una referencia a tu método de pago
                          (únicamente un token de seguridad y los últimos 4
                          dígitos para identificación). Tus datos sensibles
                          nunca se almacenan. Puedes eliminar este método en
                          cualquier momento desde{' '}
                          <Link
                            href="/payment-methods"
                            className="text-primary-600 underline hover:text-primary-700"
                            target="_blank"
                          >
                            Métodos de Pago
                          </Link>
                          . Al continuar, aceptas nuestra{' '}
                          <Link
                            href="/politica-privacidad"
                            className="text-primary-600 underline hover:text-primary-700"
                            target="_blank"
                          >
                            Política de Privacidad
                          </Link>
                          .
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {false && savedPaymentMethods.length === 0 && !useNewPaymentMethod && (
                  <p className="mt-4 text-xs text-gray-500">
                    💡 Puedes guardar tu método de pago para agilizar futuras
                    compras. Solo se guardará si lo autorizas explícitamente.
                  </p>
                )}
              </div>
            )}

            {/* Wompi (headless): se monta oculto para que autoOpen funcione sin UI extra */}
            <div aria-hidden="true">
              {orderId && integritySignature ? (
                (() => {
                  const publicKey =
                    wompiPublicKey ||
                    process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ||
                    (typeof window !== 'undefined'
                      ? (window as any).__WOMPI_PUBLIC_KEY__
                      : undefined);

                  if (!publicKey) return null;

                  const customerData = buildCustomerData();
                  const hasLegalIdForTokenization = Boolean(
                    customerData?.legalId && customerData?.legalIdType
                  );
                  const safeCollectPaymentSource =
                    consentToSavePaymentMethod && isWompiDataValid;
                    consentToSavePaymentMethod &&
                    isWompiDataValid &&
                    hasLegalIdForTokenization;
                  
                  return (
                    <WompiWidget
                      amountInCents={remainingAmount}
                      reference={orderId}
                      integritySignature={integritySignature}
                      publicKey={publicKey}
                      redirectUrl={`${
                        typeof window !== 'undefined' ? window.location.origin : ''
                      }/orders/${orderId}/payment-result`}
                      onSuccess={() => {
                        clearCart(university.slug);
                        router.push(`/orders/${orderId}/payment-result`);
                      }}
                      onError={(error) => {
                        setPaymentError(error);
                        setIntegritySignature(null);
                        setOrderId(null);
                      }}
                      autoOpen={true}
                      collectPaymentSource={safeCollectPaymentSource}
                      acceptanceToken={acceptanceToken}
                      customerData={customerData}
                    />
                  );
                })()
              ) : null}
            </div>

            {/* Use Credits */}
            {userCredits > 0 && (
              <div className="card">
                <div className="mb-4 flex items-center gap-2 border-b pb-4">
                  <Wallet className="h-5 w-5 text-primary-600" />
                  <h3 className="text-lg font-semibold">Usar Créditos</h3>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg bg-primary-50 p-4">
                    <p className="text-sm text-gray-700">
                      Créditos disponibles:{' '}
                      <span className="font-semibold text-primary-600">
                        {formatCurrency(userCredits)}
                      </span>
                    </p>
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useCredits}
                      onChange={(e) => {
                        setUseCredits(e.target.checked);
                        if (e.target.checked) {
                          // Auto-set to max available (min of userCredits or cartTotal)
                          setCreditsToUse(
                            Math.min(userCredits, cartTotalBeforeCredits)
                          );
                        } else {
                          setCreditsToUse(0);
                        }
                      }}
                      disabled={loading}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">
                      Usar créditos para este pedido
                    </span>
                  </label>

                  {useCredits && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Cantidad a usar (máx.{' '}
                        {formatCurrency(
                          Math.min(userCredits, cartTotalBeforeCredits)
                        )}
                        )
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={Math.min(userCredits, cartTotalBeforeCredits)}
                        step="100"
                        value={creditsToUse}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          const maxValue = Math.min(
                            userCredits,
                            cartTotalBeforeCredits
                          );
                          setCreditsToUse(Math.min(value, maxValue));
                        }}
                        disabled={loading}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Puedes usar hasta{' '}
                        {formatCurrency(
                          Math.min(userCredits, cartTotalBeforeCredits)
                        )}{' '}
                        de tus créditos
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Coupon */}
            <div className="card">
              {cart.length > 0 && cart[0]?.restaurantId && (
                <CouponInput
                  restaurantId={cart[0].restaurantId}
                  orderAmount={cartSubtotal}
                  onCouponApplied={(coupon) => {
                    setAppliedCoupon({
                      id: coupon.id,
                      code: coupon.code,
                      discountAmount: coupon.discountAmount,
                    });
                  }}
                  onCouponRemoved={() => setAppliedCoupon(null)}
                />
              )}
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="card sticky top-4">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold">Resumen del Pedido</h2>
                {cart.length > 0 && (
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          '¿Estás seguro de que quieres vaciar tu canasta? Esto eliminará todos los productos.'
                        )
                      ) {
                        clearCart(university.slug);
                        setCart([]);
                        window.dispatchEvent(new Event('cart-updated'));
                        router.push(`/${university.slug}`);
                      }
                    }}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 active:scale-95 md:px-4 md:py-2"
                    title="Vaciar canasta"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Vaciar</span>
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(cartSubtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Descuento:</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  {deliveryCostInCents > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Domicilio:</span>
                      <span>{formatCurrency(deliveryCostInCents)}</span>
                    </div>
                  )}
                  {takeoutFeeAmount > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Recargo para llevar:</span>
                      <span>{formatCurrency(takeoutFeeAmount)}</span>
                    </div>
                  )}
                  {serviceFeeAmount > 0 ? (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Costo de Servicio (UPick):</span>
                      <span>{formatCurrency(serviceFeeAmount)}</span>
                    </div>
                  ) : freeFeeThreshold > 0 ? (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Costo de Servicio:</span>
                      <span>
                        <span className="line-through text-gray-400">{formatCurrency(lowOrderFee)}</span>{' '}
                        <span className="font-semibold">GRATIS</span>
                      </span>
                    </div>
                  ) : null}
                  {creditsAmountInCents > 0 && (
                    <div className="flex justify-between text-sm text-primary-600">
                      <span>Créditos:</span>
                      <span>-{formatCurrency(creditsAmountInCents)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="mb-2 flex justify-between">
                    <span className="font-semibold">Total:</span>
                    <span className="text-lg font-bold text-primary-600">
                      {formatCurrency(cartTotalInCents)}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-100 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                    <ShoppingCart className="h-4 w-4" />
                    <span>Productos: {cart.length}</span>
                  </div>
                  <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{restaurant?.name || 'Restaurante'}</span>
                  </div>
                  {/* Show items with notes and quantity controls */}
                  <div className="mt-3 space-y-2 border-t pt-2">
                    {cart.map((item, index) => (
                      <div key={index} className="rounded-lg border border-gray-200 p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-700">
                              {item.name}
                            </div>
                            <div className="mt-1 text-xs text-gray-600">
                              {formatCurrency(item.unitPrice * item.quantity)}
                            </div>
                            {item.notes && (
                              <div className="mt-1 rounded bg-yellow-50 px-2 py-1 text-xs text-yellow-800">
                                <span className="font-medium">Nota:</span>{' '}
                                {item.notes}
                              </div>
                            )}
                          </div>
                          <div className="ml-3 flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (item.quantity > 1) {
                                  handleUpdateQuantity(
                                    item.productId,
                                    item.quantity - 1,
                                    item.options,
                                    item.notes
                                  );
                                } else {
                                  handleRemoveItem(item.productId, item.options);
                                }
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={loading}
                              title="Reducir cantidad"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-[2rem] text-center text-sm font-semibold text-gray-900">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => {
                                handleUpdateQuantity(
                                  item.productId,
                                  item.quantity + 1,
                                  item.options,
                                  item.notes
                                );
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={loading}
                              title="Aumentar cantidad"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {pickupMode === 'ASAP' ? (
                  <div className="rounded-lg bg-green-50 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                      <Clock className="h-4 w-4" />
                      <span>Hora de recogida:</span>
                    </div>
                    <p className="mt-1 text-sm text-green-600">
                      ⚡ Lo más pronto posible
                    </p>
                  </div>
                ) : selectedSlot ? (
                  <div className="rounded-lg bg-red-50 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                      <Clock className="h-4 w-4" />
                      <span>Hora de recogida:</span>
                    </div>
                    <p className="mt-1 text-sm text-red-600">
                      {format(selectedSlot, 'PPpp', { locale: es })}
                    </p>
                  </div>
                ) : null}

                <button
                  onClick={handleCheckout}
                  disabled={
                    loading ||
                    (pickupMode === 'SCHEDULED' && !selectedSlot) ||
                    !!(orderId && integritySignature) ||
                    loadingSlots ||
                    !!slotsRestrictionError ||
                    (serviceMode === 'internal_delivery' && !selectedDeliveryPointId)
                  }
                  className="w-full rounded-md bg-primary-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {loading
                    ? 'Procesando...'
                    : orderId && integritySignature
                      ? 'Esperando pago...'
                      : 'Realizar Pedido'}
                </button>

                <p className="text-center text-xs text-gray-500">
                  Pago seguro con Wompi
                </p>

                {paymentError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-800">{paymentError}</p>

                    {paymentError === missingInfoMessage && (
                      <button
                        type="button"
                        onClick={() => router.push('/settings')}
                        className="mt-2 w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Ir a Configuración
                      </button>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
