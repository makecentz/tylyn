export function AuthCard({ script, title, children }: { script: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-blush px-4 pb-24 pt-12 sm:px-6">
      <div className="mx-auto flex max-w-[480px] flex-col gap-6 rounded-[22px] border-t-4 border-pink bg-white p-7 shadow-[0_18px_50px_-30px_rgba(10,10,10,0.45)] sm:p-9">
        <div className="flex flex-col gap-1">
          <span className="font-script text-4xl text-pink">{script}</span>
          <h1 className="font-serif text-4xl">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" className="rounded-lg bg-[#FFE3F1] px-3 py-2 text-sm text-[#8E0B50]">{message}</p>;
}
