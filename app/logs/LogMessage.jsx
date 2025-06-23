const LogMessage = ({ log }) => {
  const getLogColor = (level) => {
    switch (level) {
      case "ERROR":
        return "text-[#F31260]";
      case "WARN":
        return "text-[#F5A524]";
      default:
        return "text-[#17C964]";
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4 py-2 border-b border-border/30 last:border-b-0">
      <div className="col-span-9 font-mono text-sm flex items-center">
        <span className={getLogColor(log.level)}>[{log.level}]</span>{" "}
        <span className="text-foreground ml-2">{log.message}</span>
      </div>
      <div className="col-span-3 text-right text-muted-foreground font-mono text-sm">
        {new Date(log.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default LogMessage;
