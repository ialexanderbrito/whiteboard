/**
 * Utilitário para geração do payload oficial PIX EMV (BR Code)
 * Chave Pix: pix@ialexanderbrito.dev
 */

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

// Cálculo CRC16-CCITT (Polinômio 0x1021, valor inicial 0xFFFF)
function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

export interface PixPayloadOptions {
  pixKey: string;
  merchantName?: string;
  merchantCity?: string;
  amount?: number;
  txId?: string;
}

export function generatePixPayload({
  pixKey = 'pix@ialexanderbrito.dev',
  merchantName = 'ALEXANDER BRITO',
  merchantCity = 'SAO PAULO',
  amount,
  txId = '***',
}: PixPayloadOptions): string {
  // Limpeza e normalização
  const key = pixKey.trim();
  const cleanName = merchantName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25).toUpperCase();
  const cleanCity = merchantCity.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 15).toUpperCase();
  const cleanTxId = (txId || '***').slice(0, 25);

  // Merchant Account Information (ID 26)
  const gui = formatField('00', 'br.gov.bcb.pix');
  const keyField = formatField('01', key);
  const merchantAccountInfo = formatField('26', `${gui}${keyField}`);

  // Montagem dos campos
  let payload = '';
  payload += formatField('00', '01'); // Payload Format Indicator
  payload += merchantAccountInfo;
  payload += formatField('52', '0000'); // Merchant Category Code
  payload += formatField('53', '986'); // Currency (986 = BRL)

  if (amount && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    payload += formatField('54', formattedAmount);
  }

  payload += formatField('58', 'BR'); // Country Code
  payload += formatField('59', cleanName); // Merchant Name
  payload += formatField('60', cleanCity); // Merchant City

  // Additional Data Field Template (ID 62)
  const txIdField = formatField('05', cleanTxId);
  payload += formatField('62', txIdField);

  // CRC16 placeholder (ID 63, length 04)
  payload += '6304';
  const checksum = crc16(payload);

  return `${payload}${checksum}`;
}
