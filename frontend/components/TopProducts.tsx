type TopProductsProps = {
  products: Array<{ productId: string; revenue: number; orders: number }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function TopProducts({ products }: TopProductsProps) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="mb-4 text-sm font-medium text-zinc-300">
        Top Products (30 Days)
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="px-2 py-2 font-medium">Rank</th>
              <th className="px-2 py-2 font-medium">Product ID</th>
              <th className="px-2 py-2 font-medium">Revenue</th>
              <th className="px-2 py-2 font-medium">Orders</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td className="px-2 py-4 text-zinc-500" colSpan={4}>
                  No product revenue yet.
                </td>
              </tr>
            ) : (
              products.map((product, index) => (
                <tr
                  key={`${product.productId}-${index}`}
                  className="border-b border-zinc-900 text-zinc-300"
                >
                  <td className="px-2 py-3">#{index + 1}</td>
                  <td className="px-2 py-3 font-mono text-xs text-zinc-200">
                    {product.productId}
                  </td>
                  <td className="px-2 py-3">
                    {formatCurrency(product.revenue)}
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
