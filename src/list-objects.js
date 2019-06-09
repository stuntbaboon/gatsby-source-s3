import AWS from 'aws-sdk';
import omit from 'lodash.omit';

/*
 * Recursively lists all bucket objects using the returned NextContinuationToken
 */
export const listObjects = (bucket, config = {}, MaxKeys = 1000) => {
  AWS.config.update(config);

  const s3 = new AWS.S3();

  const buckets = [].concat(bucket);

  return Promise.all(
    buckets.map(bucket => {
      const listContents = (
        Bucket,
        ContinuationToken = null,
        allContents = []
      ) =>
        s3
          .listObjectsV2({
            MaxKeys,
            ContinuationToken,
            ...(typeof Bucket === 'string'
              ? { Bucket }
              : omit(Bucket, 'Filter')),
          })
          .promise()
          .then(content => {
            if (Bucket.Filter) {
              content.Contents = (content.Contents || []).filter(Bucket.Filter);
            }

            const Contents = allContents.concat(content.Contents);

            return content.NextContinuationToken
              ? listContents(bucket, content.NextContinuationToken, Contents)
              : { ...content, Contents, KeyCount: Contents.length };
          });

      return listContents(bucket);
    })
  );
};
