import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function installments(price: number): string | null {
  if (price < 30) return null;
  const parcelas = price >= 150 ? 6 : 3;
  const valor = price / parcelas;
  return `${parcelas}x de ${fmt(valor)} sem juros`;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem }  = useCart();
  const navigate     = useNavigate();
  const { name, originalPrice, price, discount, image, stock } = product;

  const outOfStock = stock !== null && stock === 0;
  const isNew      = discount === 0;
  const isPromo    = discount > 0;

  function handleCardClick() {
    navigate(`/produto/${product.id}`, { state: { product } });
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.stopPropagation();
    if (outOfStock) return;
    addItem(product);
  }

  const parcelamento = installments(price);

  return (
    <div
      onClick={handleCardClick}
      className={`flex flex-col bg-background rounded-lg overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
        outOfStock ? "opacity-60" : ""
      }`}
    >
      {/* Área da imagem */}
      <div className="relative bg-card rounded-lg overflow-hidden" style={{ aspectRatio: "3/4" }}>
        {/* Badge */}
        {outOfStock ? (
          <span className="absolute top-2 left-2 bg-gray-500 text-white text-[10px] font-bold px-2 py-0.5 z-10 tracking-wider uppercase">
            Esgotado
          </span>
        ) : stock !== null && stock <= 5 ? (
          <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 z-10 tracking-wider uppercase">
            Últimas {stock}
          </span>
        ) : isPromo ? (
          <span className="absolute top-2 left-2 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 z-10 tracking-wider">
            -{discount}%
          </span>
        ) : (
          <span className="absolute top-2 left-2 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 z-10 tracking-wider uppercase">
            Novo
          </span>
        )}

        {/* Imagem */}
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />

        {/* Botão add ao carrinho */}
        {!outOfStock && (
          <button
            onClick={handleAddToCart}
            title="Adicionar ao carrinho"
            className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-900 hover:text-white text-gray-900"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Info do produto */}
      <div className="pt-2 pb-1 px-0.5">
        <p className="text-xs text-foreground font-medium leading-snug line-clamp-2 mb-1.5">{name}</p>

        <div>
          {isPromo && originalPrice > price && (
            <p className="text-[10px] text-muted-foreground line-through leading-none mb-0.5">
              {fmt(originalPrice)}
            </p>
          )}
          <p className="text-sm font-bold text-foreground leading-none">{fmt(price)}</p>
          {parcelamento && (
            <p className="text-[10px] text-muted-foreground mt-1">{parcelamento}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
