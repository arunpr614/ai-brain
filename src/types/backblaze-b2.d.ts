declare module "backblaze-b2" {
  interface B2Options {
    applicationKeyId: string;
    applicationKey: string;
  }

  interface ListBucketsResult {
    data: { buckets: Array<{ bucketId: string; bucketName: string }> };
  }

  interface GetUploadUrlResult {
    data: { uploadUrl: string; authorizationToken: string };
  }

  interface UploadFileArgs {
    uploadUrl: string;
    uploadAuthToken: string;
    fileName: string;
    data: Buffer;
  }

  class B2 {
    constructor(options: B2Options);
    authorize(): Promise<unknown>;
    listBuckets(): Promise<ListBucketsResult>;
    getUploadUrl(args: { bucketId: string }): Promise<GetUploadUrlResult>;
    uploadFile(args: UploadFileArgs): Promise<unknown>;
  }

  export default B2;
}
