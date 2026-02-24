import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
    const [step, setStep] = useState(1);
    const [copied, setCopied] = useState(false);
    const router = useRouter();

    // State for step 3
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [selectedTime, setSelectedTime] = useState<Date | null>(new Date());

    const handleNext = () => setStep((s) => s + 1);

    const handleDateSubmit = () => {
        if (selectedDate && selectedTime) {
            localStorage.setItem('movieNightDate', selectedDate.toISOString());
            localStorage.setItem('movieNightTime', selectedTime.toISOString());
            handleNext();
        }
    };

    const handleEnterRoom = () => {
        router.push('/room/sargam-shashwat-room');
    };

    const copyInviteLink = () => {
        const url = window.location.origin;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative">
            {/* Decorative background blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-pink-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[40rem] h-[40rem] bg-pink-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div
                        key="step1"
                        variants={containerVariants}
                        initial="hidden" animate="visible" exit="exit"
                        className="glass-card max-w-lg w-full p-8 md:p-12 rounded-3xl text-center space-y-6"
                    >
                        <h1 className="text-3xl md:text-4xl font-semibold text-gray-800 tracking-tight">
                            Hi Sargam 🙂
                        </h1>
                        <p className="text-gray-600 text-lg leading-relaxed">
                            Yaar… bohot ho gaya and mood off, hogaye naa and tu thak gayi hoge internships, deadlines, forms, karte karte. Thoda chill karte hain na?
                        </p>
                        <button
                            onClick={handleNext}
                            className="mt-6 px-8 py-4 bg-pink-400 hover:bg-pink-500 text-white font-medium rounded-2xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-1"
                        >
                            Ek idea hai 👀
                        </button>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        key="step2"
                        variants={containerVariants}
                        initial="hidden" animate="visible" exit="exit"
                        className="glass-card max-w-lg w-full p-8 md:p-12 rounded-3xl text-center space-y-6"
                    >
                        <p className="text-gray-700 text-xl leading-relaxed font-medium">
                            Socha ek movie dekhte hain sath mein. <br />
                            <span className="text-pink-500">Proper chill vibe. No stress.</span>
                        </p>
                        <p className="text-gray-600 text-lg">
                            Bas tu, aur ek acchi movie.
                        </p>
                        <button
                            onClick={handleNext}
                            className="mt-6 px-8 py-4 bg-blue-400 hover:bg-blue-500 text-white font-medium rounded-2xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-1"
                        >
                            Kab free hai tu? 🎬
                        </button>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div
                        key="step3"
                        variants={containerVariants}
                        initial="hidden" animate="visible" exit="exit"
                        className="glass-card max-w-lg w-full p-8 md:p-10 rounded-3xl text-center space-y-6"
                    >
                        <h2 className="text-2xl font-semibold text-gray-800">
                            Bata de kab free hai…<br />
                            <span className="text-pink-500 text-xl">main apna schedule adjust kar loonga 🙂</span>
                        </h2>

                        <div className="space-y-4 text-left pt-4">
                            <div>
                                <label className="block text-gray-700 font-medium mb-2">Kab free ho tu?</label>
                                <DatePicker
                                    selected={selectedDate}
                                    onChange={(date: Date | null) => setSelectedDate(date)}
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all text-gray-700"
                                    dateFormat="MMMM d, yyyy"
                                    minDate={new Date()}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-medium mb-2">Us din ka time jo comfortable ho:</label>
                                <DatePicker
                                    selected={selectedTime}
                                    onChange={(date: Date | null) => setSelectedTime(date)}
                                    showTimeSelect
                                    showTimeSelectOnly
                                    timeIntervals={15}
                                    timeCaption="Time"
                                    dateFormat="h:mm aa"
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all text-gray-700"
                                />
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 italic mt-4">
                            Jo bhi time bole, wohi final 🙂
                        </p>

                        <button
                            onClick={handleDateSubmit}
                            className="w-full mt-2 px-8 py-4 bg-pink-400 hover:bg-pink-500 text-white font-medium rounded-2xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-1"
                        >
                            Done, ye time theek hai ✅
                        </button>
                    </motion.div>
                )}

                {step === 4 && (
                    <motion.div
                        key="step4"
                        variants={containerVariants}
                        initial="hidden" animate="visible" exit="exit"
                        className="glass-card max-w-lg w-full p-8 md:p-12 rounded-3xl text-center space-y-6"
                    >
                        <h2 className="text-2xl font-semibold text-gray-800">
                            Kahan dekhna comfortable lagega?
                        </h2>
                        <p className="text-gray-600 line-through decoration-pink-300 decoration-2">
                            Google Meet / Zoom / offline toh abko abhi aana hi nahi
                        </p>
                        <p className="text-gray-700 font-medium leading-relaxed bg-blue-50/50 p-4 rounded-xl">
                            Ab chalo humara khud ka platform use karte hain. YT/any link paste kar sakte hain. Tu special guest hai, tu pehle enter kar!
                        </p>

                        <button
                            onClick={handleEnterRoom}
                            className="mt-6 px-10 py-4 bg-gradient-to-r from-pink-400 to-blue-400 hover:from-pink-500 hover:to-blue-500 text-white font-medium rounded-2xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-1 text-lg w-full flex items-center justify-center gap-2"
                        >
                            Enter Room 💗
                        </button>

                        <button
                            onClick={copyInviteLink}
                            className="w-full mt-2 px-6 py-3 bg-white/50 hover:bg-white text-pink-600 font-medium rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 border border-pink-200"
                        >
                            {copied ? '✅ Invite Link Copied to Clipboard!' : '🔗 Copy App Link to Invite her'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
