import { Plus, ArrowDown } from "lucide-react";

interface ProductCardProps {
  name: string;
  quantity: string;
  oldPrice: string;
  newPrice: string;
  discount: number;
  image: string;
}

const ProductCard = ({ name, quantity, oldPrice, newPrice, discount, image }: ProductCardProps) => {
  return (
    <div className="min-w-[180px] max-w-[200px] bg-background border border-border rounded-card p-3 flex flex-col gap-2 hover:shadow-md transition-shadow relative group">
      {/* Discount badge */}
      {discount > 0 && (
        <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-discount text-discount-foreground text-xs font-bold px-2 py-0.5 rounded-full">
          <ArrowDown className="h-3 w-3" />
          {discount}%
        </div>
      )}
      <img src={image} alt={name} className="w-full h-32 object-contain mx-auto" />
      <p className="text-xs text-foreground font-medium leading-tight line-clamp-2">{name}</p>
      <p className="text-xs text-muted-foreground">{quantity}</p>
      <div className="flex items-end justify-between mt-auto">
        <div>
          <p className="text-xs text-muted-foreground line-through">{oldPrice}</p>
          <p className="text-sm font-bold text-foreground">{newPrice}</p>
        </div>
        <button className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
