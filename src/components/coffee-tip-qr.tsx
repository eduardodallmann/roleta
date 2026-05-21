import QRCode from 'qrcode';

const pixCode = process.env.PIX;

export default async function CoffeeTipQr() {
  if (!pixCode) {
    return null;
  }

  const qrCodeDataUrl = await QRCode.toDataURL(pixCode, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 152,
  });

  return (
    <aside className="fixed bottom-4 left-4 z-50 w-56 rounded-xl border border-black/10 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
      <p className="text-sm font-semibold text-zinc-900">
        Me pague um cafezin ☕
      </p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-700">
        Se quiser me motivar, o QR está aqui. Spoiler: pagar não compra sorte na
        roleta 😏 — só a consciência limpa de quem apoiou.
      </p>
      <img
        alt="QR Code para pagamento via Pix"
        className="mt-3 mx-auto h-38 w-38 rounded-md border border-zinc-200 bg-white"
        height={152}
        src={qrCodeDataUrl}
        width={152}
      />
    </aside>
  );
}
