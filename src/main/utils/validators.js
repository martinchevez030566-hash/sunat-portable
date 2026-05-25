function validateSunatDoc(data, companyId) {
  const errors = [];
  
  // 1. Validación matemática: Subtotal + IGV ≈ Total (tolerancia 0.01 por redondeo)
  const calculatedTotal = (data.subtotal || 0) + (data.igv || 0);
  const diff = Math.abs(calculatedTotal - (data.total || 0));
  if (diff > 0.01) {
    errors.push(`Matemático: Subtotal(${data.subtotal}) + IGV(${data.igv}) = ${calculatedTotal.toFixed(2)} ≠ Total(${data.total})`);
  }

  // 2. RUC válido (11 dígitos, inicia con 1,2,5,6,10,20)
  const validRucPrefix = /^[1256]|10|20/;
  if (!data.proveedorRuc || !/^\d{11}$/.test(data.proveedorRuc) || !validRucPrefix.test(data.proveedorRuc.substring(0,2))) {
    errors.push(`RUC Proveedor inválido: ${data.proveedorRuc}`);
  }
  if (data.clienteRuc && !/^\d{11}$/.test(data.clienteRuc) && data.clienteRuc !== '10000000000') { // 10000000000 = Consumidor Final genérico
    errors.push(`RUC Cliente inválido: ${data.clienteRuc}`);
  }

  // 3. Fecha válida (no futura, formato correcto)
  if (data.fechaEmision) {
    const emitDate = new Date(data.fechaEmision);
    const today = new Date();
    today.setHours(0,0,0,0);
    if (emitDate > today) {
      errors.push(`Fecha de emisión futura: ${data.fechaEmision}`);
    }
    if (isNaN(emitDate.getTime())) {
      errors.push(`Fecha inválida: ${data.fechaEmision}`);
    }
  }

  // 4. Serie-Número requerido y con formato SUNAT
  if (!data.serieNumero || !/^[A-Z0-9]{3,4}[-\s]?\d{4,10}$/i.test(data.serieNumero.replace(/[\s-]/g, ''))) {
    errors.push(`Serie-Número inválido: ${data.serieNumero}`);
  }

  // 5. Total positivo
  if ((data.total || 0) <= 0) {
    errors.push(`Total debe ser positivo: ${data.total}`);
  }

  // 6. Tipo documento válido
  const validTypes = ['FACTURA', 'BOLETA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'GUIA_REMISION', 'RETENCION', 'PERCEPCION'];
  if (!validTypes.includes(data.tipo)) {
    errors.push(`Tipo de documento no soportado: ${data.tipo}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [] // Para reglas no bloqueantes (ej: cliente sin nombre)
  };
}

module.exports = { validateSunatDoc };