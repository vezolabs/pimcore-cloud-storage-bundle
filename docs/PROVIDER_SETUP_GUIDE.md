# Cloud Storage Provider Setup & IAM Permissions Guide

This guide describes the minimal required cloud IAM permissions and configuration steps for each supported cloud storage provider.

---

## 1. Amazon S3 & S3-Compatible Storage

### Recommended Authentication: IAM Roles / Instance Profiles
If Pimcore runs on AWS (EC2, ECS, or EKS with IRSA), choose **IAM Role / Workload Identity** in the wizard. No static secrets will be stored in Pimcore.

### Access Key Authentication
If running outside AWS, create an IAM user with programmatic access and attach the policy below.

### Minimal IAM Policy for S3

Replace `your-pimcore-bucket` with your actual bucket name:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PimcoreBucketAccess",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": "arn:aws:s3:::your-pimcore-bucket"
        },
        {
            "Sid": "PimcoreObjectAccess",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::your-pimcore-bucket/*"
        }
    ]
}
```

### S3-Compatible Services (MinIO, Wasabi, Cloudflare R2, Ceph)
1. **Endpoint**: Enter the full URL (e.g. `https://minio.internal.net:9000` or `https://<account_id>.r2.cloudflarestorage.com`).
2. **Use Path-Style Addressing**: Enable this switch for MinIO, LocalStack, and Ceph.
3. **Region**: Use `us-east-1` or `auto` for services that do not enforce AWS regions.

---

## 2. Microsoft Azure Blob Storage

### Authentication Options:
1. **Connection String**: Found in the Azure Portal under *Storage account -> Security + networking -> Access keys*.
2. **Account Key**: Enter Storage Account Name and Key.
3. **Azure Managed Identity**: Recommended for Azure VMs, AKS, or App Services.

### Minimal Azure RBAC Role
Assign the **Storage Blob Data Contributor** role to your user or Managed Identity on the target container or storage account:

- Actions permitted:
  - `Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read`
  - `Microsoft.Storage/storageAccounts/blobServices/containers/blobs/write`
  - `Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete`

---

## 3. Google Cloud Storage (GCS)

### Authentication Options:
1. **Service Account Key (JSON)**: Create a Service Account in the GCP Console, generate a JSON key, and paste the contents into the wizard.
2. **Application Default Credentials (ADC) / Workload Identity**: Recommended for Google Kubernetes Engine (GKE) or Google Compute Engine (GCE).

### Minimal GCP IAM Roles
Assign the following role to your Service Account on the bucket:

- **Storage Object Admin** (`roles/storage.objectAdmin`):
  - `storage.objects.get`
  - `storage.objects.create`
  - `storage.objects.delete`
  - `storage.objects.list`
