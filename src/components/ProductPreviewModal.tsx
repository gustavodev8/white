import { X, ArrowDown, Plus, ExternalLink, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import type { Product } from "@/types";
import { fmt } from "@/lib/formatters";

interface ProductPreviewModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductPreviewModal({ product, onClose }: ProductPreviewModalProps) {
  const { addItem } = useCart();

  if (!product) return null;

  const outOfStock  = product.stock !== null && product.stock === 0;
  const lowStock    = product.stock !== null && product.stock > 0 && product.stock <= 5;

  function handleAddToCart() {
    if (outOfStock) return;
    addItem(product!);
    onClose();
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 fade-in duration-200 overflow-hidden">

        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>

        {/* Badge desconto */}
        {product.discount > 0 && !outOfStock && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-0.5 bg-[#e8001c] text-white text-xs font-bold px-2.5 py-1 rounded-full">
            <ArrowDown className="h-3 w-3" />
            {product.discount}%
          </div>
        )}

        {/* Badge esgotado */}
        {outOfStock && (
          <div className="absolute top-3 left-3 z-10 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            Esgotado
          </div>
        )}

        {/* Imagem */}
        <div className={`w-full h-52 flex items-center justify-center bg-gray-50 ${outOfStock ? "opacity-60" : ""}`}>
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain p-6"
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
          />
        </div>

        {/* Conteúdo */}
        <div className="p-5 space-y-4">

          {/* Nome + marca */}
          <div>
            <h2 className="text-base font-bold text-gray-800 leading-snug">
              {product.name}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {product.brand}
              {product.quantity ? ` · ${product.quantity}` : ""}
            </p>
          </div>

          {/* Preço */}
          <div className="flex items-end gap-2">
            {product.discount > 0 && (
              <p className="text-sm text-gray-400 line-through mb-0.5">
                {fmt(product.originalPrice)}
              </p>
            )}
            <p className="text-2xl font-extrabold text-gray-900">
              {fmt(product.price)}
            </p>
            {product.discount > 0 && (
              <span className="text-sm text-green-600 font-semibold mb-0.5">
                economize {fmt(product.originalPrice - product.price)}
              </span>
            )}
          </div>

          {/* Status de estoque */}
          {product.stock !== null && (
            <div className="flex items-center gap-1.5">
              {outOfStock ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="text-sm text-red-600 font-medium">Produto esgotado</span>
                </>
              ) : lowStock ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-sm text-amber-600 font-medium">
                    Últimas {product.stock} unidades
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <span className="text-sm text-green-600 font-medium">
                    Em estoque
                  </span>
                </>
              )}
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full font-semibold text-sm transition-colors ${
                outOfStock
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-[#e8001c] hover:bg-[#c4001a] text-white"
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              {outOfStock ? "Indisponível" : "Adicionar ao carrinho"}
            </button>

            <Link
              to={`/produto/${product.id}`}
              state={{ product }}
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center rounded-full border border-gray-200 hover:border-[#e8001c] hover:text-[#e8001c] text-gray-500 transition-colors shrink-0"
              title="Ver produto completo"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
