export const numberFormatter = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });
export const currencyFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 2,
});
