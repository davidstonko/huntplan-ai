// Mock for @react-native-documents/picker
// Used during jest testing when the native module is not available.
//
// Matches the real v10.x API surface:
//   pick(), pickDirectory(), saveDocuments(), types, errorCodes, isErrorWithCode()
// Docs: https://react-native-documents.github.io/docs/doc-picker-api

module.exports = {
  pick: jest.fn(),
  pickDirectory: jest.fn(),
  saveDocuments: jest.fn(),
  types: {
    pdf: 'com.adobe.pdf',
    doc: 'com.microsoft.word.doc',
    docx: 'com.microsoft.word.docx',
    plainText: 'public.plain-text',
  },
  errorCodes: {
    OPERATION_CANCELED: 'OPERATION_CANCELED',
    IN_PROGRESS: 'IN_PROGRESS',
    UNABLE_TO_OPEN_FILE_TYPE: 'UNABLE_TO_OPEN_FILE_TYPE',
  },
  isErrorWithCode: jest.fn((err, code) => err && err.code === code),
};
