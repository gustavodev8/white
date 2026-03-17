import { useRef, useState, useEffect } from "react";
import {
  Camera, ImagePlus, Link2, Loader2, X, Plus, Check, ChevronDown, ChevronUp,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createProduct, updateProduct } from "@/services/productsService";
import { useActiveSections } from "@/hooks/useSections";
import type { ProductCategory } from "@/types";

// ─── Dados estáticos ──────────────────────────────────────────────────────────
const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "Camisas",    label: "Camisas / Camisetas"  },
  { value: "Calçados",   label: "Calçados / Tênis"     },
  { value: "Shorts",     label: "Shorts / Bermudas"    },
  { value: "Calças",     label: "Calças / Jeans"       },
  { value: "Vestidos",   label: "Vestidos / Saias"     },
  { value: "Bolsas",     label: "Bolsas / Mochilas"    },
  { value: "Perfumes",   label: "Perfumes"             },
  { value: "acessorios", label: "Acessórios"           },
  { value: "feminino",   label: "Feminino (Geral)"     },
  { value: "masculino",  label: "Masculino (Geral)"    },
  { value: "infantil",   label: "Infantil"             },
];

const GRADE_PRESETS: Record<string, { label: string; sizes: string[] }> = {
  calcados_adulto:   { label: "Calçados Adulto",   sizes: ["33","34","35","36","37","38","39","40","41","42","43","44","45"] },
  calcados_infantil: { label: "Calçados Infantil",  sizes: ["15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32"] },
  roupas_adulto:     { label: "Roupas Adulto",      sizes: ["PP","P","M","G","GG","XGG"] },
  roupas_infantil:   { label: "Roupas Infantil",    sizes: ["2","4","6","8","10","12","14","16"] },
};

const CAT_PRESET: Partial<Record<ProductCategory, string>> = {
  "Calçados": "calcados_adulto",
  "Camisas":  "roupas_adulto",
  "Shorts":   "roupas_adulto",
  "Calças":   "roupas_adulto",
  "Vestidos": "roupas_adulto",
  "infantil": "roupas_infantil",
};

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  name:          z.string().min(2, "Nome obrigatório"),
  brand:         z.string().min(1, "Marca obrigatória"),
  quantity:      z.string().min(1, "Informe a apresentação ou selecione tamanhos"),
  price:         z.coerce.number().positive("Preço deve ser positivo"),
  originalPrice: z.coerce.number().positive("Preço original deve ser positivo"),
  category:      z.string().min(1, "Categoria obrigatória"),
  sections:      z.array(z.string()),
  isActive:      z.boolean(),
});

type FormValues = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────
export interface AdminProductFormProps {
  product?: {
    id: string; name: string; brand: string; quantity: string;
    price: number; originalPrice: number; discount: number;
    image: string; category: string; sections: string[];
    isActive: boolean; stock: number | null;
    sizeStock?: Record<string, number> | null;
  };
  onSuccess: () => void;
  onCancel:  () => void;
}

// ─── Utilitário ───────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive mt-1">{msg}</p>;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function AdminProductForm({ product, onSuccess, onCancel }: AdminProductFormProps) {
  const isEditing   = Boolean(product);
  const fileRef     = useRef<HTMLInputElement>(null);
  const cameraRef   = useRef<HTMLInputElement>(null);
  const allSections = useActiveSections();

  // Imagem
  const [imageFile,      setImageFile]      = useState<File | null>(null);
  const [imageUrl,       setImageUrl]       = useState(product?.image ?? "");
  const [imagePreview,   setImagePreview]   = useState(product?.image ?? "");
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [compressing,    setCompressing]    = useState(false);

  // Grade de tamanhos
  const initSizes = product?.sizeStock ? Object.keys(product.sizeStock) : [];
  const [useSizeGrid,    setUseSizeGrid]    = useState(initSizes.length > 0);
  const [selectedSizes,  setSelectedSizes]  = useState<string[]>(initSizes);
  const [customSizeInput,setCustomSizeInput]= useState("");
  const [showPresets,    setShowPresets]    = useState(false);

  // Estoque inicial (só ao criar)
  const [initialStock, setInitialStock] = useState("");

  // Form
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormValues>({
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

  const priceVal    = watch("price");
  const origPrice   = watch("originalPrice");
  const categoryVal = watch("category");
  const autoDiscount =
    origPrice > 0 && priceVal < origPrice
      ? Math.round(((origPrice - priceVal) / origPrice) * 100)
      : 0;

  // Sync campo quantity com os tamanhos selecionados
  useEffect(() => {
    if (useSizeGrid && selectedSizes.length > 0) {
      setValue("quantity", selectedSizes.join(" / "), { shouldValidate: true });
    }
  }, [useSizeGrid, selectedSizes, setValue]);

  // Sugere preset quando muda categoria
  useEffect(() => {
    if (CAT_PRESET[categoryVal as ProductCategory] && !useSizeGrid && selectedSizes.length === 0) {
      setShowPresets(true);
    }
  }, [categoryVal]); // eslint-disable-line

  // ── Imagem ─────────────────────────────────────────────────────────────────
  async function compressImage(file: File): Promise<File> {
    return new Promise(resolve => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX_W = 900;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const TARGET = 130 * 1024;
        let q = 0.82;
        const next = () => {
          canvas.toBlob(blob => {
            if (!blob) { resolve(file); return; }
            if (blob.size <= TARGET || q < 0.25) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
            } else { q -= 0.08; next(); }
          }, "image/jpeg", q);
        };
        next();
      };
      img.onerror = () => resolve(file);
    });
  }

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const url = e.target.value;
    setImageUrl(url); setImageFile(null); setCompressedSize(null); setImagePreview(url);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true); setImagePreview("");
    try {
      const c = await compressImage(file);
      setImageFile(c); setCompressedSize(c.size);
      setImagePreview(URL.createObjectURL(c)); setImageUrl("");
    } finally {
      setCompressing(false);
      if (fileRef.current)   fileRef.current.value   = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  function handleRemoveFile() {
    setImageFile(null); setCompressedSize(null); setImagePreview(imageUrl);
    if (fileRef.current)   fileRef.current.value   = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  // ── Grade ─────────────────────────────────────────────────────────────────
  function applyPreset(key: string) {
    const p = GRADE_PRESETS[key];
    if (!p) return;
    setSelectedSizes(p.sizes);
    setUseSizeGrid(true);
    setShowPresets(false);
  }

  function toggleSize(size: string) {
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  }

  function addCustomSize() {
    const s = customSizeInput.trim().toUpperCase();
    if (!s || selectedSizes.includes(s)) return;
    setSelectedSizes(prev => [...prev, s]);
    setCustomSizeInput("");
  }

  function enableGrade() {
    setUseSizeGrid(true);
    setShowPresets(true);
    if (!selectedSizes.length) setValue("quantity", " ", { shouldValidate: false });
  }

  function disableGrade() {
    setUseSizeGrid(false);
    setSelectedSizes([]);
    setShowPresets(false);
    setValue("quantity", "", { shouldValidate: false });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function onSubmit(values: FormValues) {
    setSubmitting(true); setError(null);
    try {
      const sizeStockFinal =
        useSizeGrid && selectedSizes.length > 0
          ? Object.fromEntries(selectedSizes.map(s => [s, product?.sizeStock?.[s] ?? 0]))
          : null;

      const stockFinal =
        isEditing     ? (product?.stock ?? null)
        : useSizeGrid ? 0
        : (Number(initialStock) > 0 ? Number(initialStock) : null);

      const input = {
        name:          values.name,
        brand:         values.brand,
        quantity:      useSizeGrid && selectedSizes.length > 0 ? selectedSizes.join(" / ") : values.quantity,
        price:         values.price,
        originalPrice: values.originalPrice,
        discount:      autoDiscount,
        imageUrl:      imageFile ? imagePreview : imageUrl,
        category:      values.category as ProductCategory,
        sections:      values.sections,
        isActive:      values.isActive,
        stock:         stockFinal,
        sizeStock:     sizeStockFinal,
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* ── FOTO ─────────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Foto</SectionLabel>
        <div className="flex gap-5 items-start">

          {/* Preview */}
          <div className="shrink-0">
            {compressing ? (
              <div className="w-28 h-36 rounded-xl border border-border bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-[10px]">Comprimindo…</span>
              </div>
            ) : imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview"
                  className="w-28 h-36 object-cover rounded-xl border border-border"
                  onError={e => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                {compressedSize !== null && (
                  <span className="absolute bottom-1 left-1 right-1 text-center text-[9px] font-semibold bg-gray-900 text-white rounded px-1 py-0.5">
                    {Math.round(compressedSize / 1024)} KB
                  </span>
                )}
                {imageFile && (
                  <button type="button" onClick={handleRemoveFile}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-sm">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-28 h-36 rounded-xl border-2 border-dashed border-border bg-muted/40 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-foreground/30 hover:bg-muted transition-colors">
                <ImagePlus className="h-6 w-6 opacity-30" />
                <span className="text-[10px] text-center leading-tight px-2">Adicionar foto</span>
              </button>
            )}
          </div>

          {/* Controles */}
          <div className="flex-1 grid grid-cols-1 gap-2">
            <button type="button" onClick={() => cameraRef.current?.click()} disabled={compressing}
              className="flex items-center gap-2.5 w-full border border-border rounded-lg px-4 py-2.5 text-sm text-left hover:bg-secondary transition-colors disabled:opacity-40">
              <Camera className="h-4 w-4 text-muted-foreground shrink-0" />
              Câmera
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={compressing}
              className="flex items-center gap-2.5 w-full border border-border rounded-lg px-4 py-2.5 text-sm text-left hover:bg-secondary transition-colors disabled:opacity-40">
              <ImagePlus className="h-4 w-4 text-muted-foreground shrink-0" />
              Galeria / Arquivo
            </button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />ou link<div className="flex-1 h-px bg-border" />
            </div>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input type="url" value={imageUrl} onChange={handleUrlChange}
                placeholder="https://..." disabled={Boolean(imageFile)}
                className="pl-9 text-sm" />
            </div>
          </div>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        <input ref={fileRef}   type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      <div className="h-px bg-border" />

      {/* ── NOME + MARCA ──────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Informações do produto</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-medium">Nome <span className="text-destructive">*</span></Label>
            <Input id="name" {...register("name")}
              placeholder="Ex: Camisa Polo Slim Fit Preta" className="h-10" />
            <FieldError msg={errors.name?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand" className="text-sm font-medium">Marca <span className="text-destructive">*</span></Label>
            <Input id="brand" {...register("brand")}
              placeholder="Ex: Nike, Adidas, Lacoste…" className="h-10" />
            <FieldError msg={errors.brand?.message} />
          </div>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* ── CATEGORIA ─────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Categoria</SectionLabel>
        <Controller control={control} name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError msg={errors.category?.message} />
      </div>

      <div className="h-px bg-border" />

      {/* ── TAMANHOS / VARIAÇÕES ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Tamanhos / Variações</SectionLabel>
          {/* Toggle */}
          <div className="flex border border-border rounded-lg overflow-hidden text-xs">
            <button type="button" onClick={disableGrade}
              className={`px-3 py-1.5 font-medium transition-colors ${
                !useSizeGrid ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary"
              }`}>
              Simples
            </button>
            <button type="button" onClick={enableGrade}
              className={`px-3 py-1.5 font-medium transition-colors border-l border-border ${
                useSizeGrid ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary"
              }`}>
              Grade de tamanhos
            </button>
          </div>
        </div>

        {!useSizeGrid ? (
          /* ── Modo simples ──────────────────────── */
          <div className="space-y-2">
            <Input id="quantity" {...register("quantity")}
              placeholder="Ex: Tamanho Único, 100ml, Kit com 3…"
              className="h-10" />
            <p className="text-xs text-muted-foreground">
              Texto que aparece para o cliente descrevendo a variação do produto.
            </p>
            {CAT_PRESET[categoryVal as ProductCategory] && (
              <button type="button" onClick={enableGrade}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-foreground transition-colors">
                Este produto pode ter grade de tamanhos — configurar grade
              </button>
            )}
            <FieldError msg={errors.quantity?.message} />
          </div>
        ) : (
          /* ── Modo grade ────────────────────────── */
          <div className="space-y-4">

            {/* Presets */}
            <div className="border border-border rounded-xl overflow-hidden">
              <button type="button" onClick={() => setShowPresets(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-secondary transition-colors text-left">
                Grades pré-definidas
                {showPresets
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {showPresets && (
                <div className="border-t border-border px-4 py-3 flex flex-wrap gap-2">
                  {Object.entries(GRADE_PRESETS).map(([key, preset]) => {
                    const isSuggested = CAT_PRESET[categoryVal as ProductCategory] === key;
                    return (
                      <button key={key} type="button" onClick={() => applyPreset(key)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          isSuggested
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                        }`}>
                        {preset.label}
                        {isSuggested && " — sugerido"}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tamanhos ativos */}
            {selectedSizes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Tamanhos selecionados — clique para remover
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedSizes.map(size => (
                    <button key={size} type="button"
                      onClick={() => toggleSize(size)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-semibold hover:bg-destructive transition-colors group">
                      {size}
                      <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Adicionar tamanho avulso */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Adicionar tamanho
              </Label>
              <div className="flex gap-2">
                <Input value={customSizeInput} onChange={e => setCustomSizeInput(e.target.value)}
                  placeholder="Ex: 46, XS, XXXL…" className="h-9 text-sm"
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomSize(); } }} />
                <Button type="button" variant="outline" size="sm"
                  onClick={addCustomSize} disabled={!customSizeInput.trim()} className="h-9 px-3 shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Resultado */}
            {selectedSizes.length > 0 ? (
              <div className="flex items-center gap-2 bg-secondary rounded-lg px-4 py-2.5">
                <Check className="h-3.5 w-3.5 text-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Grade: <span className="font-semibold text-foreground">{selectedSizes.join(" / ")}</span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground border border-border rounded-lg px-4 py-2.5">
                Nenhum tamanho selecionado. Escolha uma grade acima ou adicione manualmente.
              </p>
            )}

            {errors.quantity && <FieldError msg={errors.quantity.message} />}

            <p className="text-xs text-muted-foreground">
              O estoque por tamanho é configurado na aba <strong>Estoque</strong> após salvar o produto.
            </p>
          </div>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* ── PREÇOS ────────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Preços</SectionLabel>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="originalPrice" className="text-sm font-medium">
              Preço original (R$) <span className="text-destructive">*</span>
            </Label>
            <Input id="originalPrice" type="number" step="0.01"
              {...register("originalPrice")} placeholder="0,00" className="h-10" />
            <p className="text-[11px] text-muted-foreground">Preço cheio, sem desconto</p>
            <FieldError msg={errors.originalPrice?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price" className="text-sm font-medium">
              Preço de venda (R$) <span className="text-destructive">*</span>
            </Label>
            <Input id="price" type="number" step="0.01"
              {...register("price")} placeholder="0,00" className="h-10" />
            <p className="text-[11px] text-muted-foreground">Valor final cobrado do cliente</p>
            <FieldError msg={errors.price?.message} />
          </div>
        </div>

        {autoDiscount > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-secondary border border-border rounded-lg px-4 py-2.5">
            <span className="text-sm font-semibold">{autoDiscount}% de desconto</span>
            <span className="text-xs text-muted-foreground">calculado automaticamente</span>
          </div>
        )}

        {/* Estoque inicial (só ao criar sem grade) */}
        {!isEditing && !useSizeGrid && (
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="initialStock" className="text-sm font-medium">
              Estoque inicial
              <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
            </Label>
            <Input id="initialStock" type="number" min="0"
              value={initialStock} onChange={e => setInitialStock(e.target.value)}
              placeholder="0" className="h-10 max-w-36" />
            <p className="text-[11px] text-muted-foreground">Quantidade disponível para venda imediatamente.</p>
          </div>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* ── SEÇÕES ────────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-3">
          <SectionLabel>Seções do carrossel</SectionLabel>
          <p className="text-xs text-muted-foreground -mt-2">
            Em quais vitrines este produto vai aparecer na loja?
          </p>
        </div>
        <Controller control={control} name="sections"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {allSections.map(sec => {
                const active = field.value.includes(sec.name);
                return (
                  <button key={sec.id} type="button"
                    onClick={() => field.onChange(
                      active ? field.value.filter(s => s !== sec.name) : [...field.value, sec.name]
                    )}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      active
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    }`}>
                    {active && <Check className="h-3 w-3" />}
                    {sec.name}
                  </button>
                );
              })}
            </div>
          )}
        />
        <FieldError msg={errors.sections?.message} />
      </div>

      <div className="h-px bg-border" />

      {/* ── VISIBILIDADE ──────────────────────────────────────────────────── */}
      <div>
        <Controller control={control} name="isActive"
          render={({ field }) => (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Produto ativo</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {field.value
                    ? "Visível na loja e disponível para compra."
                    : "Oculto na loja. Pode ser ativado a qualquer momento."}
                </p>
              </div>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </div>
          )}
        />
      </div>

      {/* ── ERRO GLOBAL ───────────────────────────────────────────────────── */}
      {error && (
        <div className="border border-destructive/30 bg-destructive/5 rounded-lg px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* ── AÇÕES ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2 pb-4 sm:pb-0">
        <Button type="button" variant="outline" onClick={onCancel}
          disabled={submitting} className="flex-1 h-11">
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting} className="flex-1 h-11 font-semibold">
          {submitting
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando…</>
            : isEditing ? "Salvar alterações" : "Criar produto"}
        </Button>
      </div>
    </form>
  );
}
