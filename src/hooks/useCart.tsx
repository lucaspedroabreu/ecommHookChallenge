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

interface ProductStock {
	id: number;
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

		const storagedCart = localStorage.getItem('@RocketShoes:cart')

		if (storagedCart) {
			return JSON.parse(storagedCart);
		}

		return [];
	});

	const addProduct = async (productId: number) => {
		try {
			const updatedCart = [...cart]

			const hasProductOnCart = updatedCart.find(product => productId === product.id)

			const { data: productStock } = await api.get<ProductStock>(`/stock/${productId}`)
			const amountOnStock = productStock ? productStock.amount : () => toast.error('No reference of product in stock')
			const amountOnCart = hasProductOnCart ? hasProductOnCart.amount : 0;
			const desiredAmount = amountOnCart + 1;

			if (desiredAmount > amountOnStock) {
				toast.error("Quantidade solicitada fora de estoque");
				return;
			}

			if (hasProductOnCart) {
				hasProductOnCart.amount = desiredAmount;
			} else {
				const product = await api.get(`/products/${productId}`)
				const newCartProduct = {
					...product.data,
					amount: 1
				}
				updatedCart.push(newCartProduct);
			}

			setCart(updatedCart);
			localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
		} catch {
			toast.error("Erro na adição do produto");
		}
	};

	const removeProduct = (productId: number) => {
		try {
			const copiedCart = [...cart]

			const hasProductOnCart = copiedCart.find(product => productId === product.id)

			if (hasProductOnCart) {
				const updatedCart = copiedCart.filter(product => product.id !== productId)
				localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
				setCart(updatedCart)
			} else {
				throw new Error
			}
		} catch {
			toast.error("Erro na remoção do produto")
		}
	};

	const updateProductAmount = async ({
		productId,
		amount,
	}: UpdateProductAmount) => {
		try {
			if (amount < 1) return

			const productStock = await api.get(`/stock/${productId}`)
			const productStockAmount = productStock.data.amount

			if (amount > productStockAmount) {
				toast.error('Quantidade solicitada fora de estoque')
				return
			}

			const updatedCart = [...cart]
			const hasProductOnCart = updatedCart.find(product => productId === product.id)

			if (hasProductOnCart) {
				hasProductOnCart.amount = amount
				localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
				setCart(updatedCart)
			} else {
				throw new Error
			}

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
