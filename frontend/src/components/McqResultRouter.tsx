import { useParams } from "react-router-dom";
import AiMcqResult from "./AiMcqResult";
import ManualMcqResult from "./ManualMcqResult";

const McqResultRouter = () => {
  const { type, applicantId } = useParams<{
    type: string;
    applicantId: string;
  }>();

  if (type === "ai") {
    return <AiMcqResult applicantId={applicantId!} />;
  }

  return <ManualMcqResult applicantId={applicantId!} />;
};

export default McqResultRouter;
