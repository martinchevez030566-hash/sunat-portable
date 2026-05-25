const pdfParse = require('pdf-parse');

function extractPdfData(buffer) {
  return new Promise((resolve) => {
    pdfParse(buffer)
      .then(data => {
        const text = data.text.replace(/\s+/g, ' ').trim();
        if (!text || text.length < 50) {
          return resolve({ success: false, error: 'PDF vacío o sin texto extraíble' });
        }

        // 1. Campos base (ya funcionando)
        const rucMatch = text.match(/RUC\s*:?\s*(\d{11})/i);
        const serieMatch = text.match(/([FBTPNE]\d{3}[-\s]?\d{4,10})/i);
        const totalMatch = text.match(/(?:IMPORTE\s*TOTAL|TOTAL\s*A\s*PAGAR|TOTAL)\s*:?\s*S\/?\s*([\d,]+\.\d{2})/i);
        const fechaMatch = text.match(/(?:FECHA\s*(?:DE\s*)?EMISI[OÓ]N|EMISI[OÓ]N)\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
        const tipoMatch = text.match(/(FACTURA|BOLETA|NOTA\s*(?:DE\s*)?CR[EÉ]DITO|NOTA\s*(?:DE\s*)?D[EÉ]BITO)\s*ELECTR[OÓ]NICA/i);

        // 2. 🔑 NUEVO: Extraer CLIENTE (Nombre y RUC)
        let clientName = null;
        let clientRuc = null;

        // Buscar bloque después de "Señor(es):", "Cliente:" o "Receptor:"
        const clientBlock = text.match(/(?:SEÑOR\(ES\):|CLIENTE:|RAZ[OÓ]N\s*SOCIAL\s*DEL\s*RECEPTOR:|RECEPTOR:)\s*([\s\S]{0,500}?)(?:RUC\s*:?\s*\d{11}|DIRECCIÓN|ESTABLECIMIENTO|TOTAL|IMPORTE)/i);
        if (clientBlock) {
          const block = clientBlock[1];
          // El nombre suele ser la primera línea limpia
          clientName = block.split(/[\/\n\r]/)[0].trim().replace(/^[:\-\s\.]+/, '').substring(0, 120) || null;
          // El RUC del cliente suele estar en el mismo bloque
          const cRuc = block.match(/RUC\s*:?\s*(\d{11})/i);
          clientRuc = cRuc?.[1] || null;
        }

        // Fallback: Si hay múltiples RUCs, el segundo suele ser el cliente
        if (!clientRuc) {
          const allRucs = text.match(/\d{11}/g);
          if (allRucs && allRucs.length >= 2) clientRuc = allRucs[1];
        }

        // 3. 🔑 NUEVO: Extraer SUBTOTAL e IGV
        const subtotalMatch = text.match(/(?:OP\.?\s*GRAVADA|SUBTOTAL|BASE\s*IMPOSIBLE|VALOR\s*VENTA|VALOR\s*REFERENCIAL)\s*:?\s*S\/?\s*([\d,]+\.\d{2})/i);
        const igvMatch = text.match(/(?:IGV|IVA|IMPUESTO|TASA\s*18%|18\.00%)\s*:?\s*S\/?\s*([\d,]+\.\d{2})/i);

        const total = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0;
        const subtotal = subtotalMatch ? parseFloat(subtotalMatch[1].replace(/,/g, '')) : 0;
        const igv = igvMatch ? parseFloat(igvMatch[1].replace(/,/g, '')) : 0;

        // Calcular automáticamente si no los encuentra pero tiene el total
        let finalSubtotal = subtotal;
        let finalIgv = igv;
        if (total > 0 && (finalSubtotal === 0 || finalIgv === 0)) {
          finalSubtotal = parseFloat((total / 1.18).toFixed(2));
          finalIgv = parseFloat((total - finalSubtotal).toFixed(2));
        }

        console.log(`✅ [PDF] ${serieMatch?.[1] || 'S/N'} | RUC: ${rucMatch?.[1] || 'N/A'} | Cliente: ${clientName || 'N/A'} | Subtotal: S/ ${finalSubtotal.toFixed(2)} | IGV: S/ ${finalIgv.toFixed(2)} | Total: S/ ${total.toFixed(2)}`);

        resolve({
          success: true,
          data: {
            tipo: tipoMatch?.[1]?.toUpperCase().replace(/\s+/g, '_') || 'PDF_SUNAT',
            ruc: rucMatch?.[1],
            clienteNombre: clientName,
            clienteRuc: clientRuc,
            serieNumero: serieMatch?.[1] || '', // ✅ Se guarda completo
            fecha: fechaMatch?.[1],
            subtotal: finalSubtotal,
            igv: finalIgv,
            total: total,
            rawPreview: text.substring(0, 500)
          }
        });
      })
      .catch(err => {
        console.error('❌ [PDF]', err.message);
        resolve({ success: false, error: `Error extrayendo PDF: ${err.message}` });
      });
  });
}

module.exports = { extractPdfData };