import { X, Trash2, ShoppingBag, Plus, Minus } from "lucide-react";
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

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Painel — desliza da direita */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white flex flex-col shadow-2xl
          transition-transform duration-300 ease-in-out will-change-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#e8001c]" />
            <span className="text-base font-bold text-gray-800">Meu Carrinho</span>
            {items.length > 0 && (
              <span className="text-xs bg-[#e8001c] text-white px-2 py-0.5 rounded-full font-semibold">
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
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 px-6">
            <ShoppingBag className="h-14 w-14 text-gray-200" />
            <p className="text-base font-semibold text-gray-500">Seu carrinho está vazio</p>
            <p className="text-sm text-center text-gray-400">
              Adicione produtos para continuar as compras
            </p>
            <button
              onClick={onClose}
              className="mt-2 bg-[#e8001c] hover:bg-[#c4001a] text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-colors"
            >
              Continuar comprando
            </button>
          </div>
        ) : (
          <>
            {/* Itens */}
            <ul className="flex-1 overflow-y-auto divide-y divide-gray-100 px-4 py-2">
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
                    className="self-start text-gray-300 hover:text-[#e8001c] transition-colors mt-0.5"
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
                className="w-full bg-[#e8001c] hover:bg-[#c4001a] text-white font-bold py-3 rounded-full transition-colors text-sm flex items-center justify-center"
              >
                Finalizar pedido
              </Link>

              {/* Limpar carrinho */}
              <button
                onClick={clearCart}
                className="w-full text-xs text-gray-400 hover:text-[#e8001c] transition-colors py-1"
              >
                Limpar carrinho
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
