export const conditionCatalogTemplate = {
  domain: 'example',
  fields: [
    {
      fieldPath: 'status',
      sampleValue: 'PENDING',
      possibleValues: ['PENDING', 'COMPLETE', 'CANCELLED'],
      sources: ['sample', 'manual'],
      isConditionField: true,
      notes: 'Main status of the entity',
    },
    {
      fieldPath: 'payment.type',
      sampleValue: 'COD',
      possibleValues: ['COD', 'BANK', 'QR'],
      sources: ['sample', 'manual'],
      isConditionField: true,
      notes: 'Payment method affects payment behavior',
    },
  ],
};
