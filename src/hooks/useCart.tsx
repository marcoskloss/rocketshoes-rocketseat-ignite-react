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
      const stockResponse = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stockResponse.data.amount
      
      let currentProductAmountInCart = cart
        .find(item => item.id === productId)
        ?.amount;

      if (stockAmount === undefined) 
        throw new Error();

      const hasItemInStock = stockAmount > (currentProductAmountInCart || 0);
      
      if (!hasItemInStock) { 
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      
      const isProductInCart = cart.some(product => product.id === productId);
      if (isProductInCart) {
        const newState = cart.map(item => {
          if (item.id === productId) item.amount += 1;
          return item;
        });

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newState));
        setCart(newState)
        return;
      }

      const productsResponse = await api.get<Product>(`/products/${productId}`);
      const product = productsResponse.data;

      if (!product) {
        toast.error('Erro na adição do produto');
        return;
      }

      product.amount = 1;

      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify([...cart, product])
      );
      setCart(prevState => [...prevState, product]);
    } catch (err) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.some(item => item.id === productId)) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const updatedCart = cart.filter(item => item.id !== productId);
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
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

      const stockResponse = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stockResponse.data.amount;

      const hasItemInStock = stockAmount > amount;
      
      if (!hasItemInStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart
        .map(item => {
          if (item.id === productId) {
            item.amount = amount;
          }
          return item;
        });

      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(updatedCart)
      );
      
      setCart(updatedCart);
    } catch (err) {
      toast.error('Erro na alteração de quantidade do produto');
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
