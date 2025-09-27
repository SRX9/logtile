import AWS from "aws-sdk";

AWS.config.update({
  region: "ap-south-1",
  accessKeyId: process.env.ACCESS_KYE_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});

const queueUrl = process.env.SQS_CHANGELOG_JOB_PUSH!;

export const pushToChangelogJobQueue = async (job_id: string) => {
  const sqs = new AWS.SQS();

  const params = {
    MessageBody: job_id,
    QueueUrl: queueUrl,
  };

  try {
    const data = await sqs.sendMessage(params).promise();
    console.log(
      `Successfully sent message to SQS queue. Job ID: ${job_id} Message ID: ${data.MessageId}`
    );
  } catch (error: any) {
    console.error(
      `Error sending message to SQS Changelog Job queue: ${error?.message}`
    );
  }
};
