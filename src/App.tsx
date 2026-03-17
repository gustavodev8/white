import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import ProductPage from "./pages/ProductPage";
import CategoryPage from "./pages/CategoryPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import AccountPage from "./pages/AccountPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import CollectionPage from "./pages/CollectionPage";

const queryClient = new QueryClient();

// ─── Page transition wrapper ────────────────────────────────────────────────
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-page-in">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/produto/:id" element={<ProductPage />} />
        <Route path="/categoria/:slug" element={<CategoryPage />} />
        <Route path="/carrinho" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/minha-conta" element={<AccountPage />} />
        <Route path="/entrar" element={<AuthPage />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/colecao/:slug" element={<CollectionPage />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
