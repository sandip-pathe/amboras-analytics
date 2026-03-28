import { useEffect, useState } from "react";

type TopProductsProps = {
  products: Array<{ productId: string; revenue: number; orders: number }>;
  title?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function TopProducts({ products, title }: TopProductsProps) {
  const [animateBars, setAnimateBars] = useState(false);

  useEffect(() => {
    setAnimateBars(false);
    const timer = setTimeout(() => setAnimateBars(true), 40);
    return () => clearTimeout(timer);
  }, [products]);

  const maxRevenue =
    products.length > 0
      ? Math.max(...products.map((product) => product.revenue))
      : 0;

  return (
    <section className="rounded-xl border border-[#e8e4de] bg-white/95 p-4 backdrop-blur-[2px] sm:p-5">
      <p className="mb-4 text-sm font-medium tracking-[-0.01em] text-[#1f1e1a]">
        {title ?? "Top Products"}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-120 border-collapse text-left text-sm sm:min-w-full">
          <thead>
            <tr className="border-b border-[#ece9e3] text-[#7d7a73]">
              <th className="px-2 py-2 font-medium">Product</th>
              <th className="px-2 py-2 font-medium">Revenue</th>
              <th className="px-2 py-2 font-medium">Orders</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td className="px-2 py-4 text-[#888880]" colSpan={3}>
                  No product revenue yet.
                </td>
              </tr>
            ) : (
              products.map((product, index) => (
                <tr
                  key={`${product.productId}-${index}`}
                  className="border-b border-[#f2f0eb] text-[#2d2b26]"
                >
                  <td className="px-2 py-3">
                    <span className="mr-2 text-xs text-[#8f8b84]">
                      #{index + 1}
                    </span>
                    <span className="font-medium">
                      Product {product.productId}
                    </span>
                  </td>
                  <td className="relative px-2 py-3">
                    <span
                      className="absolute left-0 top-1/2 h-[70%] -translate-y-1/2 rounded-sm bg-green-100/80 transition-[width] duration-700 ease-out"
                      style={{
                        width: `${animateBars && maxRevenue > 0 ? (product.revenue / maxRevenue) * 100 : 0}%`,
                      }}
                    />
                    <span className="relative z-10">
                      {formatCurrency(product.revenue)}
                    </span>
                  </td>
                  <td className="px-2 py-3">{product.orders}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
