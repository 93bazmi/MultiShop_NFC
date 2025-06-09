import { useLocation } from "wouter";
import { useEffect } from "react";

const ProductsPage = () => {
  const [_, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to shops page
    setLocation("/shops", { replace: true });
  }, [setLocation]);

  return null;
};

export default ProductsPage;
