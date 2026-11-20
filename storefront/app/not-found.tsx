export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-32 sm:px-6 lg:px-10">
      <h1 className="font-display text-5xl">Sayfa bulunamadı</h1>
      <a href="/koleksiyon/" className="mt-5 inline-flex min-h-11 items-center font-medium text-cocoa underline underline-offset-4">
        Koleksiyona dön
      </a>
    </div>
  );
}
