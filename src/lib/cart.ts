/**
 * Shopping cart utilities (localStorage-based)
 *
 * ✅ Persistencia: localStorage
 * ✅ Restricción: NO mezclar restaurantes en un mismo carrito
 * ✅ "Identidad" de un item: productId + options + notes
 */

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;

  // unitPrice (según tu app) está en centavos
  unitPrice: number;

  restaurantId: string;
  restaurantName: string;

  // Comentarios/nota del usuario (afecta identidad del item)
  notes?: string;

  // Personalización (afecta identidad del item)
  options?: Array<{
    productOptionId: string;
    name: string;
    priceDelta: number; // en centavos
  }>;
}

const normalizeOptions = (opts?: CartItem['options']) => {
  if (!opts?.length) return '';

  return opts
    .map(o => o.productOptionId)
    .sort()
    .join('|');
};

// Key principal del carrito
const CART_KEY = (hubId: string) => `upic_cart_${hubId}`;

// Key para recordar el restaurante “actual” del carrito
const RESTAURANT_KEY = 'upic_current_restaurant';

const HUB_KEY = 'upic_current_hub';

/**
 * Get cart from localStorage
 *
 * - Si estás en SSR (window undefined), devuelve []
 * - Si existe, JSON.parse del string guardado
 */
export function getCart(hubId: string): CartItem[] {
  if (typeof window === 'undefined') return [];

  const saved = localStorage.getItem(CART_KEY(hubId));
  return saved ? JSON.parse(saved) : [];
}

/**
 * Save cart to localStorage
 * - Reemplaza completamente el contenido del key
 */
function saveCart(cart: CartItem[], hubId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY(hubId), JSON.stringify(cart));
}

/**
 * Add item to cart
 *
 * Regla principal:
 * - Si ya hay items y el restaurantId es diferente → NO agrega y devuelve error
 *
 * Luego:
 * - Si el item ya existe (misma combinación productId + options + notes)
 *   entonces suma quantity
 * - Si no existe → push
 *
 * También:
 * - Guarda RESTAURANT_KEY para saber "carrito pertenece a X restaurante"
 */
export function addToCart(
  item: CartItem,
  hubId: string
): { success: boolean; message?: string; requiresClear?: boolean } {
  const cart = getCart(hubId);

  const currentHub =
    typeof window !== 'undefined' ? localStorage.getItem(HUB_KEY) : null;

  if (cart.length > 0 && currentHub && currentHub !== hubId) {
    return {
      success: false,
      message: 'Tu carrito tiene productos de otro campus. ¿Quieres vaciarlo y continuar?',
      requiresClear: true
    };
  }

  const currentRestaurant =
    cart.length > 0 ? cart[0].restaurantId : null;

  // 🚫 No mezclar restaurantes
  if (cart.length > 0 && currentRestaurant && currentRestaurant !== item.restaurantId) {
    return {
      success: false,
      message: 'Tu carrito tiene items de otro restaurante. ¿Quieres vaciarlo?',
      requiresClear: true
    };
  }

  /**
   * Identidad del item:
   * - productId debe coincidir
   * - options debe ser EXACTAMENTE igual (se compara por JSON.stringify)
   * - notes debe ser igual
   *
   * ⚠️ OJO:
   * JSON.stringify depende del orden del array options.
   * Si en algún lado cambian el orden, el "mismo" item podría verse distinto.
   */



  const existingIndex = cart.findIndex(
    (i) =>
      i.productId === item.productId &&
      normalizeOptions(i.options) === normalizeOptions(item.options) &&
      i.notes === item.notes
  );

  if (existingIndex >= 0) {
    // ✅ Si ya existía, solo suma cantidad
    cart[existingIndex].quantity += item.quantity;
  } else {
    // ✅ Si no existía, agrega nuevo “renglón” al carrito
    cart.push(item);
  }

  saveCart(cart, hubId);

  // Guarda restaurante actual (sirve para UI / checks)
  localStorage.setItem(RESTAURANT_KEY, item.restaurantId);

  localStorage.setItem(HUB_KEY, hubId);

  return { success: true };
}

/**
 * Remove item from cart
 *
 * Elimina SOLO el ítem que coincida por:
 * productId + options + notes
 */
export function removeFromCart(
  hubId: string,
  productId: string,
  options?: CartItem['options'],
  notes?: string
): void {
  const cart = getCart(hubId);

  const filtered = cart.filter(
    (item) =>
      !(
        item.productId === productId &&
        normalizeOptions(item.options) === normalizeOptions(options) &&
        item.notes === notes
      )
  );

  if (filtered.length === 0) {
    localStorage.removeItem(CART_KEY(hubId));
    localStorage.removeItem(RESTAURANT_KEY);
    localStorage.removeItem(HUB_KEY);
  } else {
    saveCart(filtered, hubId);
  }
}

/**
 * Update item quantity
 *
 * - Busca el item por productId + options + notes
 * - Si quantity <= 0 → removeFromCart
 * - Si no → actualiza quantity y guarda
 */
export function updateQuantity(
  hubId: string,
  productId: string,
  quantity: number,
  options?: CartItem['options'],
  notes?: string
): void {
  const cart = getCart(hubId);

  const item = cart.find(
    (i) =>
      i.productId === productId &&
      normalizeOptions(i.options) === normalizeOptions(options) &&
      i.notes === notes
  );

  if (item) {
    if (quantity <= 0) {
      removeFromCart(hubId, productId, options, notes);
    } else {
      item.quantity = quantity;
      saveCart(cart, hubId);
    }
  }
}

/**
 * Update item notes
 *
 * - Busca item por productId + options (NO incluye notes para buscar)
 * - Cambia notes y guarda
 *
 * ⚠️ OJO:
 * Esto puede romper la identidad del item si ya existía otro con las mismas options
 * pero con otra nota. Quedarían dos ítems “separados”, o podrías crear duplicados
 * con notas distintas (que es válido), pero también podrías querer mergearlos.
 */
export function updateItemNotes(
  hubId: string,
  productId: string,
  notes: string,
  options?: CartItem['options']
): void {
  const cart = getCart(hubId);

  const item = cart.find(
    (i) =>
      i.productId === productId &&
      normalizeOptions(i.options) === normalizeOptions(options)
  );

  if (item) {
    item.notes = notes || undefined;
    saveCart(cart, hubId);
  }
}

/**
 * Clear cart
 *
 * - Borra el carrito
 * - Borra el restaurante actual
 */
export function clearCart(hubId: string): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(CART_KEY(hubId));
  localStorage.removeItem(RESTAURANT_KEY);
  localStorage.removeItem(HUB_KEY);
}

/**
 * Get cart total (en centavos)
 *
 * total = sum( unitPrice*quantity + sum(options.priceDelta)*quantity )
 */
export function getCartTotal(hubId: string): number {
  const cart = getCart(hubId);
  return cart.reduce((total, item) => {
    const itemPrice = item.unitPrice * item.quantity;

    // Suma priceDelta de opciones * cantidad
    const optionsPrice =
      (item.options?.reduce((sum, opt) => sum + opt.priceDelta, 0) || 0) *
      item.quantity;

    return total + itemPrice + optionsPrice;
  }, 0);
}

/**
 * Get cart item count (cantidad total de unidades)
 */
export function getCartItemCount(hubId: string): number {
  const cart = getCart(hubId);
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Get current restaurant ID from cart
 * - Solo lee el key que guardas en addToCart()
 */
export function getCurrentRestaurantId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(RESTAURANT_KEY);
}

export function getCurrentHubId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(HUB_KEY);
}
