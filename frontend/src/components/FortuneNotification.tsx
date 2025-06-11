interface FortuneNotificationProps {
  message: string;
}

const FortuneNotification = ({ message }: FortuneNotificationProps) => {
  return (
    <div className="fixed bottom-4 right-4 max-w-sm z-50">
      <div className="fortune-paper p-4 rounded shadow-2xl">
        <p className="text-black font-mono text-sm">{message}</p>
      </div>
    </div>
  );
};

export default FortuneNotification;
