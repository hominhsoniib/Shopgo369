'use client';

import { useEffect, useState } from 'react';

export default function AgeVerificationModal() {
  const [showModal, setShowModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const yList: number[] = [];
    for (let y = currentYear; y >= 1930; y--) {
      yList.push(y);
    }
    setYears(yList);

    const verified = localStorage.getItem('htx369_age_verified');
    if (verified !== 'true') {
      setShowModal(true);
      document.body.style.overflow = 'hidden';
    }
  }, []);

  function handleConfirm() {
    if (!selectedYear) {
      setErrorMsg('⚠️ Vui lòng chọn năm sinh của bạn trước khi xác nhận.');
      return;
    }

    const birthYear = parseInt(selectedYear, 10);
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    if (age >= 18) {
      localStorage.setItem('htx369_age_verified', 'true');
      localStorage.setItem('htx369_birth_year', birthYear.toString());
      setShowModal(false);
      document.body.style.overflow = '';
    } else {
      setErrorMsg('❌ Rất tiếc! Bạn chưa đủ 18 tuổi để truy cập website theo quy định Luật Phòng, chống tác hại của rượu, bia.');
    }
  }

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="max-w-md w-full rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl relative overflow-hidden border-2 border-red-700/60"
        style={{ background: 'linear-gradient(165deg, #4A040D 0%, #6E0B19 50%, #3B0209 100%)' }}
      >
        {/* Top Logo Circle */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white p-1.5 mx-auto mb-4 shadow-2xl border-2 border-amber-400/80 flex items-center justify-center overflow-hidden">
          <img
            src="/HTX 369.png"
            alt="HTX 369"
            className="w-full h-full object-contain rounded-full"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/7_Giá_Trị_Cốt_Lõi_369.png';
            }}
          />
        </div>

        {/* Badge */}
        <p className="text-amber-400 text-xs sm:text-sm font-extrabold uppercase tracking-wider mb-2 drop-shadow">
          XÁC THỰC THÔNG TIN ĐỘ TUỔI TRUY CẬP
        </p>

        {/* Main Title */}
        <h2 className="font-display font-black text-xl sm:text-2xl text-white uppercase tracking-wide mb-3 leading-snug">
          VUI LÒNG CHỌN NĂM SINH CỦA BẠN
        </h2>

        {/* Description */}
        <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed mb-6 px-1">
          Hệ thống dựa trên thông tin năm sinh để tính tuổi pháp lý (xác định <strong className="text-amber-300 underline underline-offset-2">đủ 18 tuổi trở lên</strong>) làm căn cứ cho phép truy cập theo quy định.
        </p>

        {/* Select Year */}
        <div className="space-y-2 mb-4 text-left">
          <label htmlFor="age-verify-year-select" className="block text-center text-xs sm:text-sm font-bold text-amber-300">
            Năm sinh của bạn:
          </label>
          <select
            id="age-verify-year-select"
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setErrorMsg('');
            }}
            className="w-full p-3.5 rounded-2xl bg-white text-gray-900 font-bold text-sm sm:text-base text-center border-2 border-amber-400 shadow-lg focus:outline-none focus:ring-4 focus:ring-amber-400/40 cursor-pointer transition"
          >
            <option value="">-- Chọn Năm Sinh --</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/90 border border-red-500/60 text-red-200 text-xs text-center font-medium leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#05A85A] hover:bg-[#04934E] text-white font-extrabold text-sm sm:text-base tracking-wide uppercase shadow-xl shadow-emerald-950/60 transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 border border-emerald-400/40 cursor-pointer"
        >
          🛡️ XÁC NHẬN & TRUY CẬP
        </button>

        {/* Disclaimer */}
        <p className="text-[10px] sm:text-xs text-amber-200/70 leading-relaxed mt-6 pt-4 border-t border-white/10 text-center">
          Thông tin năm sinh là căn cứ pháp lý để thực hiện quy định Luật Phòng, chống tác hại của rượu, bia. Sản phẩm rượu không dành cho người dưới 18 tuổi.
        </p>
      </div>
    </div>
  );
}
