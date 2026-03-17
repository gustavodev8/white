import { X, Trash2, ShoppingBag, Plus, Minus } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useCart, cartTotal } from "@/hooks/useCart";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, increaseQty, decreaseQty, removeItem, clearCart } = useCart();
  const total = cartTotal(items);

  // mounted: mantém no DOM durante animação de saída
  // shown: delay de 1 frame para acionar a transição de entrada
  const [mounted, setMounted] = useState(false);
  const [shown,   setShown]   = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const t = setTimeout(() => setShown(true), 10);
      return () => clearTimeout(t);
    } else {
      setShown(false);
    }
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${
          shown ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Painel — desliza da direita */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-[51] w-full max-w-sm bg-white flex flex-col shadow-2xl
          transition-transform duration-300 ease-in-out ${
          shown ? "translate-x-0" : "translate-x-full"
        }`}
        onTransitionEnd={() => { if (!open) setMounted(false); }}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-gray-800" />
            <span className="text-base font-bold text-gray-800">Meu Carrinho</span>
            {items.length > 0 && (
              <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full font-bold">
                {items.reduce((s, i) => s + i.cartQuantity, 0)}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Lista de itens */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
            <ShoppingBag className="h-14 w-14 text-gray-200" />
            <p className="text-base font-semibold text-gray-500">Seu carrinho está vazio</p>
            <p className="text-sm text-center text-gray-400">
              Adicione produtos para continuar as compras
            </p>
            <button
              onClick={onClose}
              className="mt-2 bg-gray-900 hover:bg-black text-white text-sm font-bold px-6 py-2.5 rounded-full transition-colors"
            >
              Continuar comprando
            </button>
          </div>
        ) : (
          <>
            {/* Itens */}
            <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-100 px-4 py-2">
              {items.map((item) => (
                <li key={item.cartKey} className="flex gap-3 py-4">
                  {/* Imagem */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs text-gray-400">{item.brand}</p>
                      {item.selectedSize && (
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          {item.selectedSize}
                        </span>
                      )}
                    </div>

                    {/* Controles de quantidade */}
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
                        <button
                          onClick={() => decreaseQty(item.cartKey)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold text-gray-800">
                          {item.cartQuantity}
                        </span>
                        <button
                          onClick={() => increaseQty(item.cartKey)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <p className="text-sm font-bold text-gray-800">
                        {fmt(item.price * item.cartQuantity)}
                      </p>
                    </div>
                  </div>

                  {/* Remover */}
                  <button
                    onClick={() => removeItem(item.cartKey)}
                    className="self-start text-gray-300 hover:text-red-500 transition-colors mt-0.5"
                    title="Remover item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>

            {/* Rodapé */}
            <div className="border-t border-gray-100 px-5 py-5 flex flex-col gap-3">
              {/* Subtotal */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Subtotal</span>
                <span className="text-lg font-extrabold text-gray-800">{fmt(total)}</span>
              </div>

              <p className="text-[11px] text-gray-400 -mt-1">
                Frete calculado no checkout
              </p>

              {/* Botão finalizar */}
              <Link
                to="/carrinho"
                onClick={onClose}
                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-full transition-colors text-sm flex items-center justify-center"
              >
                Finalizar pedido
              </Link>

              {/* Limpar carrinho */}
              <button
                onClick={clearCart}
                className="w-full text-xs text-gray-400 hover:text-gray-700 transition-colors py-1"
              >
                Limpar carrinho
              </button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}
