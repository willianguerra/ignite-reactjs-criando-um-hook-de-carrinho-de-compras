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

  const getProductStock = async (productId: number) => {
    const stockResponse = await api.get(`/stock/${productId}`);
    const stock: Stock = stockResponse.data;
    return stock.amount;
  };

  const addProduct = async (productId: number) => {
    try {
      const productResponse = await api.get(`/products/${productId}`);
      const product: Product = productResponse.data;
      const productStock = await getProductStock(productId);

      const productIsInCar = cart.findIndex(item => item.id === productId) !== -1;
      const amountToAdd = cart.find(item => item.id === productId)?.amount ?? 1;
      const productHasStock = productStock > amountToAdd;
      if (!productHasStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      if (!productIsInCar) {
        const newCart = [...cart, {
          ...product, amount: 1
        }]
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
      else {
        const updatedCart = cart.map(item => {
          if (item.id === productId) {
            return { ...item, amount: item.amount + 1 }
          }
          return { ...item }
        });

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (cart.findIndex(item => item.id === productId) === -1) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const filteredCart = cart.filter(product => product.id !== productId);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(filteredCart));
      setCart(filteredCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const productStock = await getProductStock(productId);
      if (productStock < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map(cartProduct => {
        if (cartProduct.id === productId) {
          return { ...cartProduct, amount: amount }
        }
        return cartProduct;
      });

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart);
    } catch {
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
