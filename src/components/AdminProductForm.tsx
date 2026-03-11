import { useRef, useState } from "react";
import { Camera, ImagePlus, Link2, Loader2, X } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProduct, updateProduct } from "@/services/productsService";
import { useActiveSections } from "@/hooks/useSections";
import type { ProductCategory } from "@/types";

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "Camisas",    label: "Camisas / Camisetas" },
  { value: "Calçados",   label: "Calçados / Tênis"    },
  { value: "Shorts",     label: "Shorts / Bermudas"   },
  { value: "Calças",     label: "Calças / Jeans"      },
  { value: "Vestidos",   label: "Vestidos / Saias"    },
  { value: "Bolsas",     label: "Bolsas / Mochilas"   },
  { value: "Perfumes",   label: "Perfumes"            },
  { value: "acessorios", label: "Acessórios"          },
  { value: "feminino",   label: "Feminino (Geral)"    },
  { value: "masculino",  label: "Masculino (Geral)"   },
  { value: "infantil",   label: "Infantil"            },
];

// ─── Schema de validação ──────────────────────────────────────────────────────
const schema = z.object({
  name:          z.string().min(2, "Nome obrigatório"),
  brand:         z.string().min(1, "Marca obrigatória"),
  quantity:      z.string().min(1, "Quantidade obrigatória"),
  price:         z.coerce.number().positive("Preço deve ser positivo"),
  originalPrice: z.coerce.number().positive("Preço original deve ser positivo"),
  category:      z.string().min(1, "Categoria obrigatória"),
  sections:      z.array(z.string()).min(1, "Selecione ao menos uma seção"),
  isActive:      z.boolean(),
});

type FormValues = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────
export interface AdminProductFormProps {
  /** Produto em edição (undefined = novo) */
  product?: {
    id:            string;
    name:          string;
    brand:         string;
    quantity:      string;
    price:         number;
    originalPrice: number;
    discount:      number;
    image:         string;
    category:      string;
    sections:      string[];
    isActive:      boolean;
    stock:         number | null;
    sizeStock?:    Record<string, number> | null;
  };
  onSuccess: () => void;
  onCancel:  () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function AdminProductForm({
  product,
  onSuccess,
  onCancel,
}: AdminProductFormProps) {
  const isEditing   = Boolean(product);
  const fileRef     = useRef<HTMLInputElement>(null);
  const cameraRef   = useRef<HTMLInputElement>(null);
  const allSections = useActiveSections();

  const [imageFile,      setImageFile]      = useState<File | null>(null);
  const [imageUrl,       setImageUrl]       = useState<string>(product?.image ?? "");
  const [imagePreview,   setImagePreview]   = useState<string>(product?.image ?? "");
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [compressing,    setCompressing]    = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  /** Comprime imagem via canvas — alvo ~120 KB, máx 900px de largura */
  async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const MAX_W = 900;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }

        const canvas = document.createElement("canvas");
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);

        const TARGET_BYTES = 130 * 1024; // 130 KB
        let quality = 0.82;
        const tryNext = () => {
          canvas.toBlob((blob) => {
            if (!blob) { resolve(file); return; }
            if (blob.size <= TARGET_BYTES || quality < 0.25) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
            } else {
              quality -= 0.08;
              tryNext();
            }
          }, "image/jpeg", quality);
        };
        tryNext();
      };
      img.onerror = () => resolve(file); // se falhar, usa original
    });
  }

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:          product?.name          ?? "",
      brand:         product?.brand         ?? "",
      quantity:      product?.quantity      ?? "",
      price:         product?.price         ?? 0,
      originalPrice: product?.originalPrice ?? 0,
      category:      product?.category      ?? "Camisas",
      sections:      product?.sections      ?? [],
      isActive:      product?.isActive      ?? true,
    },
  });

  // Calcula desconto automaticamente
  const priceVal    = watch("price");
  const origPrice   = watch("originalPrice");
  const autoDiscount =
    origPrice > 0 && priceVal < origPrice
      ? Math.round(((origPrice - priceVal) / origPrice) * 100)
      : 0;

  // Atualiza preview quando o usuário digita/cola uma URL
  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const url = e.target.value;
    setImageUrl(url);
    setImageFile(null);
    setCompressedSize(null);
    setImagePreview(url);
  }

  // Ao selecionar arquivo ou tirar foto → comprime antes de mostrar/enviar
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    setImagePreview("");
    try {
      const compressed = await compressImage(file);
      setImageFile(compressed);
      setCompressedSize(compressed.size);
      setImagePreview(URL.createObjectURL(compressed));
      setImageUrl(""); // limpa URL quando usa arquivo
    } finally {
      setCompressing(false);
      // reseta o input para permitir re-seleção do mesmo arquivo
      if (fileRef.current)   fileRef.current.value   = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  // Remove o arquivo selecionado e volta ao campo URL
  function handleRemoveFile() {
    setImageFile(null);
    setCompressedSize(null);
    setImagePreview(imageUrl);
    if (fileRef.current)   fileRef.current.value   = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  // Submit
  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const input = {
        name:          values.name,
        brand:         values.brand,
        quantity:      values.quantity,
        price:         values.price,
        originalPrice: values.originalPrice,
        discount:      autoDiscount,
        imageUrl:      imageFile ? imagePreview : imageUrl,
        category:      values.category as ProductCategory,
        sections:      values.sections,
        isActive:      values.isActive,
        stock:         null,
        sizeStock:     null,
      };

      if (isEditing && product) {
        await updateProduct(product.id, input, imageFile ?? undefined);
      } else {
        await createProduct(input, imageFile ?? undefined);
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar produto");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Nome */}
      <div className="space-y-1">
        <Label htmlFor="name">Nome do produto *</Label>
        <Input id="name" {...register("name")} placeholder="Ex: Camisa Polo Slim Fit Preta" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Imagem */}
      <div className="border border-border rounded-xl p-4 space-y-3">
        <Label className="text-sm font-semibold">Foto do produto</Label>

        <div className="flex gap-4 items-start">
          {/* Preview */}
          <div className="shrink-0">
            {compressing ? (
              <div className="w-24 h-32 rounded-lg border border-border bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-[10px]">Comprimindo</span>
              </div>
            ) : imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-24 h-32 object-cover rounded-lg border border-border"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                />
                {compressedSize !== null && (
                  <span className="absolute bottom-1 left-1 right-1 text-center text-[9px] font-semibold bg-green-600 text-white rounded px-1 py-0.5">
                    {Math.round(compressedSize / 1024)} KB
                  </span>
                )}
              </div>
            ) : (
              <div className="w-24 h-32 rounded-lg border-2 border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground">
                <ImagePlus className="h-6 w-6 opacity-30" />
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="flex-1 flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => cameraRef.current?.click()}
              disabled={compressing}
            >
              <Camera className="h-4 w-4" />
              Câmera
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => fileRef.current?.click()}
              disabled={compressing}
            >
              <ImagePlus className="h-4 w-4" />
              Galeria / Arquivo
            </Button>

            {imageFile && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
                Remover
              </Button>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <div className="flex-1 h-px bg-border" />
              ou link
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="relative">
              <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="url"
                value={imageUrl}
                onChange={handleUrlChange}
                placeholder="https://..."
                disabled={Boolean(imageFile)}
                className="pl-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Inputs ocultos */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        <input ref={fileRef}   type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Marca */}
      <div className="space-y-1">
        <Label htmlFor="brand">Marca *</Label>
        <Input id="brand" {...register("brand")} placeholder="Ex: white.com" />
        {errors.brand && <p className="text-xs text-destructive">{errors.brand.message}</p>}
      </div>

      {/* Quantidade */}
      <div className="space-y-1">
        <Label htmlFor="quantity">Quantidade / Apresentação *</Label>
        <Input id="quantity" {...register("quantity")} placeholder="Ex: P / M / G / GG  ou  36 / 37 / 38" />
        {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
      </div>

      {/* Preços */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="originalPrice">Preço original (R$) *</Label>
          <Input
            id="originalPrice"
            type="number"
            step="0.01"
            {...register("originalPrice")}
            placeholder="0.00"
          />
          {errors.originalPrice && (
            <p className="text-xs text-destructive">{errors.originalPrice.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="price">Preço com desconto (R$) *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            {...register("price")}
            placeholder="0.00"
          />
          {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
        </div>
      </div>

      {autoDiscount > 0 && (
        <p className="text-sm text-green-600 font-medium">
          Desconto calculado: {autoDiscount}%
        </p>
      )}

      {/* Categoria */}
      <div className="space-y-1">
        <Label>Categoria *</Label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.category && (
          <p className="text-xs text-destructive">{errors.category.message}</p>
        )}
      </div>

      {/* Seções */}
      <div className="space-y-2">
        <Label>Seções do carrossel * <span className="text-xs text-muted-foreground">(selecione ao menos uma)</span></Label>
        <Controller
          control={control}
          name="sections"
          render={({ field }) => (
            <div className="space-y-2">
              {allSections.map((sec) => {
                const checked = field.value.includes(sec.name);
                return (
                  <div key={sec.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`section-${sec.id}`}
                      checked={checked}
                      onCheckedChange={(v) => {
                        if (v) {
                          field.onChange([...field.value, sec.name]);
                        } else {
                          field.onChange(field.value.filter((s) => s !== sec.name));
                        }
                      }}
                    />
                    <label
                      htmlFor={`section-${sec.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {sec.name}
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        />
        {errors.sections && (
          <p className="text-xs text-destructive">{errors.sections.message}</p>
        )}
      </div>

      {/* Ativo */}
      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <Checkbox
              id="isActive"
              checked={field.value}
              onCheckedChange={(v) => field.onChange(Boolean(v))}
            />
          )}
        />
        <Label htmlFor="isActive" className="cursor-pointer">
          Produto ativo (visível no site)
        </Label>
      </div>

      {/* Erro global */}
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Ações */}
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar produto"}
        </Button>
      </div>
    </form>
  );
}
