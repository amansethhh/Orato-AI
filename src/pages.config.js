import AIFeedback from './pages/AIFeedback';
import Home from './pages/Home';
import InterviewSetup from './pages/InterviewSetup';
import Intro from './pages/Intro';
import QuestionSetup from './pages/QuestionSetup';
import VoicePractice from './pages/VoicePractice';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIFeedback": AIFeedback,
    "Home": Home,
    "InterviewSetup": InterviewSetup,
    "Intro": Intro,
    "QuestionSetup": QuestionSetup,
    "VoicePractice": VoicePractice,
}

export const pagesConfig = {
    mainPage: "Intro",
    Pages: PAGES,
    Layout: __Layout,
};