/**
 * Wompi PSE Payment Form Component
 * Collects bank and user information for PSE payments
 */

'use client';

import { useState } from 'react';

interface WompiPSEFormProps {
  onDataReceived: (data: {
    financial_institution_code: string;
    user_type: number;
    user_legal_id_type: string;
    user_legal_id: string;
  }) => void;
  onError: (error: string) => void;
}

// Common Colombian banks for PSE
// Sorted by popularity and importance
const BANKS = [
  { code: '1507', name: 'Nequi' },
  { code: '1509', name: 'Daviplata' },
  { code: '1510', name: 'Nu Colombia' },
  { code: '1511', name: 'Lulo Bank' },
  { code: '1022', name: 'Banco de Bogotá' },
  { code: '1053', name: 'Banco Davivienda' },
  { code: '1071', name: 'Banco BBVA Colombia' },
  { code: '1065', name: 'Banco Santander' },
  { code: '1058', name: 'Banco Popular' },
  { code: '1062', name: 'Banco de Occidente' },
  { code: '1052', name: 'Banco de Colombia' },
  { code: '1001', name: 'Banco Agrario' },
  { code: '1013', name: 'Banco AV Villas' },
  { code: '1032', name: 'Banco Caja Social' },
  { code: '1051', name: 'Banco Colpatria' },
  { code: '1066', name: 'Banco Falabella' },
  { code: '1007', name: 'Bancamía' },
  { code: '1019', name: 'Bancoomeva' },
  { code: '1060', name: 'Banco Pichincha' },
  { code: '1061', name: 'Banco GNB Sudameris' },
  { code: '1067', name: 'Banco Cooperativo Coopcentral' },
  { code: '1069', name: 'Banco Serfinanza' },
  { code: '1072', name: 'Banco de la República' },
  { code: '1077', name: 'Banco Citibank' },
  { code: '1080', name: 'Banco Alianza' },
  { code: '1081', name: 'Banco Coltefinanciera' },
  { code: '1082', name: 'Banco ProCredit' },
  { code: '1088', name: 'Banco Helm' },
  { code: '1091', name: 'Banco Compensar' },
  { code: '1092', name: 'Banco Agrario de Colombia' },
];

const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'PP', label: 'Pasaporte' },
  { value: 'NIT', label: 'NIT (Empresa)' },
];

export function WompiPSEForm({ onDataReceived, onError }: WompiPSEFormProps) {
  const [bankCode, setBankCode] = useState('');
  const [userType, setUserType] = useState<number>(0);
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankCode) {
      onError('Por favor selecciona un banco');
      return;
    }

    if (!documentType) {
      onError('Por favor selecciona el tipo de documento');
      return;
    }

    if (!documentNumber || documentNumber.trim().length < 5) {
      onError('Por favor ingresa un número de documento válido');
      return;
    }

    onDataReceived({
      financial_institution_code: bankCode,
      user_type: userType,
      user_legal_id_type: documentType,
      user_legal_id: documentNumber.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Banco *
        </label>
        <select
          value={bankCode}
          onChange={(e) => setBankCode(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          required
        >
          <option value="">Selecciona tu banco</option>
          {BANKS.map((bank) => (
            <option key={bank.code} value={bank.code}>
              {bank.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Tipo de usuario *
        </label>
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="userType"
              value="0"
              checked={userType === 0}
              onChange={() => setUserType(0)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500"
            />
            <span>Persona Natural</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="userType"
              value="1"
              checked={userType === 1}
              onChange={() => setUserType(1)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500"
            />
            <span>Empresa</span>
          </label>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Tipo de documento *
        </label>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          required
        >
          <option value="">Selecciona tipo de documento</option>
          {DOCUMENT_TYPES.map((doc) => (
            <option key={doc.value} value={doc.value}>
              {doc.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Número de documento *
        </label>
        <input
          type="text"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value.replace(/\D/g, ''))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Ingresa tu número de documento"
          required
          minLength={5}
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-primary-600 px-4 py-3 font-medium text-white transition-colors hover:bg-primary-700"
      >
        Continuar con PSE
      </button>
    </form>
  );
}
