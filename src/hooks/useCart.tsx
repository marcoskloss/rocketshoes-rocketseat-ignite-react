import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get<Stock[]>('/stock');
      const stock = stockResponse.data;
      
      let currentProductAmountInCart = cart
        .find(item => item.id === productId)
        ?.amount;

      const stockAmount = stock
        .find(item => item.id === productId)
        ?.amount;
        
      if (stockAmount === undefined) 
        throw new Error('Erro na adição do produto');

      const hasItemInStock = stockAmount > (currentProductAmountInCart || 0);
      
      if (!hasItemInStock) 
        throw new Error('Quantidade solicitada fora de estoque');
      
      const isProductInCart = cart.some(product => product.id === productId);
      if (isProductInCart) {
        console.log('aqui');
        const newState = cart.map(item => {
          if (item.id === productId) item.amount += 1;
          return item;
        });

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newState));
        setCart(newState)
        return;
      }

      const productsResponse = await api.get('/products');
      const product = productsResponse
        .data
        .find((product: { id: number } ) => product.id === productId);

      if (!product) throw new Error('Erro na adição do produto');

      product.amount = 1;

      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify([...cart, product])
      );
      setCart(prevState => [...prevState, product]);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = cart.filter(item => item.id !== productId);
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stockResponse = await api.get<Stock[]>('/stock');
      const stock = stockResponse.data;
      
      const stockAmount = stock
        .find(item => item.id === productId)
        ?.amount;
        
      if (stockAmount === undefined) 
        throw new Error('Erro na alteração de quantidade do produto');

      const hasItemInStock = stockAmount > amount;
      
      if (!hasItemInStock) 
        throw new Error('Quantidade solicitada fora de estoque');

      const productResponse = await api.get<Product[]>('/products');
      const products = productResponse.data;

      const newItem = products.find(item => item.id === productId);
      if (!newItem) 
        throw new Error('Erro na alteração de quantidade do produto');
      
      const updatedCart = [...cart, newItem];
      setCart(updatedCart);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
