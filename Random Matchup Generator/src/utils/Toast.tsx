// toasts.ts
import { toast } from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faTimesCircle } from "@fortawesome/free-solid-svg-icons";

export const showErrorToast = (message: string, details: string) => {
    toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-red-100 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                        <FontAwesomeIcon icon={faTimesCircle} className="h-10 w-10 text-red-600" />
                    </div>
                    <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-red-800">{message}</p>
                        <p className="mt-1 text-sm text-red-600">{details}</p>
                    </div>
                </div>
            </div>
        </div>
    ));
};

export const showSuccessToast = (message: string, details: string) => {
    toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-green-100 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                        <FontAwesomeIcon icon={faCheckCircle} className="h-10 w-10 text-green-600" />
                    </div>
                    <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-green-800">{message}</p>
                        <p className="mt-1 text-sm text-green-600">{details}</p>
                    </div>
                </div>
            </div>
        </div>
    ));
};

export const showDefaultToast = (message: string) => {
    toast(message);
};
