function parseSunatXML(xmlString) {
  try {
    const extract = (pattern, flags = 'i') => {
      const match = xmlString.match(new RegExp(pattern, flags));
      if (!match) return null;
      return match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
    };

    const typeCode = extract('(?:cbc:)?InvoiceTypeCode[^>]*>\\s*(\\d+)\\s*</');
    const tipoMap = { '01': 'FACTURA', '03': 'BOLETA', '07': 'NOTA_CREDITO', '08': 'NOTA_DEBITO' };
    const tipo = tipoMap[typeCode] || 'DOCUMENTO';

    const serieNumero = extract('<cbc:ID[^>]*>\\s*([FBTPNE]\\d{3}[-\\s]?\\d{4,10})\\s*</')?.replace(/[\s-]/g, '') || '';

    const fechaEmision = extract('(?:cbc:)?IssueDate[^>]*>\\s*(\\d{4}-\\d{2}-\\d{2})\\s*</');
    const moneda = extract('(?:cbc:)?DocumentCurrencyCode[^>]*>\\s*([A-Z]{3})\\s*</') || 'PEN';

    const proveedorRuc = extract('AccountingSupplierParty[\\s\\S]{0,1000}?<cbc:ID[^>]*>\\s*(\\d{11})\\s*</');
    const clienteRuc = extract('AccountingCustomerParty[\\s\\S]{0,1000}?<cbc:ID[^>]*>\\s*(\\d{11})\\s*</');

    let clienteNombre = extract('AccountingCustomerParty[\\s\\S]{0,1500}?<cbc:RegistrationName[^>]*>\\s*([\\s\\S]*?)\\s*</cbc:RegistrationName>');
    if (!clienteNombre) {
      clienteNombre = extract('AccountingCustomerParty[\\s\\S]{0,1500}?<cac:PartyName[\\s\\S]{0,300}?<cbc:Name[^>]*>\\s*([\\s\\S]*?)\\s*</cbc:Name>');
    }

    const parseAmount = (raw) => raw ? parseFloat(raw.replace(/,/g, '')) : 0;

    const subtotal = parseAmount(extract('LegalMonetaryTotal[\\s\\S]{0,500}?<cbc:LineExtensionAmount[^>]*>\\s*([\\d,]+\\.\\d{2})\\s*</'));
    const igv = parseAmount(extract('TaxTotal[\\s\\S]{0,300}?<cbc:TaxAmount[^>]*>\\s*([\\d,]+\\.\\d{2})\\s*</'));
    const total = parseAmount(extract('LegalMonetaryTotal[\\s\\S]{0,500}?<cbc:PayableAmount[^>]*>\\s*([\\d,]+\\.\\d{2})\\s*</'));

    const items = [];
    const linePattern = /<cac:InvoiceLine[\s\S]*?<\/cac:InvoiceLine>/gi;
    let lineMatch;
    let lineNum = 1;

    while ((lineMatch = linePattern.exec(xmlString)) !== null) {
      const lineXml = lineMatch[0];
      const getFromLine = (pattern) => {
        const m = lineXml.match(new RegExp(pattern, 'i'));
        if (!m) return null;
        const content = m[1].trim();
        const cdata = content.match(/<!\[CDATA\[(.*?)\]\]>/);
        return cdata ? cdata[1].trim() : content;
      };

      items.push({
        linea: lineNum++,
        descripcion: getFromLine('<cbc:Description[^>]*>\\s*([\\s\\S]*?)\\s*</cbc:Description>') || 'S/D',
        cantidad: parseAmount(getFromLine('<cbc:InvoicedQuantity[^>]*>\\s*([\\d,]+\\.?\\d*)\\s*</')),
        unitario: parseAmount(getFromLine('<cac:Price[\\s\\S]{0,150}?<cbc:PriceAmount[^>]*>\\s*([\\d,]+\\.\\d{2})\\s*</')),
        totalLinea: parseAmount(getFromLine('<cbc:LineExtensionAmount[^>]*>\\s*([\\d,]+\\.\\d{2})\\s*</'))
      });
    }

    console.log(`✅ [XML] ${serieNumero} | Cliente: ${clienteNombre || 'N/A'} | Total: S/ ${total.toFixed(2)}`);

    return {
      success: true,
      data: {
        tipo, serieNumero, fechaEmision, moneda, proveedorRuc, clienteRuc, clienteNombre,
        subtotal: subtotal || 0, igv: igv || 0, total: total || 0, items
      }
    };
  } catch (err) {
    console.error('❌ [XML]', err.message);
    return { success: false, error: `Error parseando XML: ${err.message}` };
  }
}
module.exports = { parseSunatXML };