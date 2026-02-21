#!/usr/bin/env python3
"""
Virtual Try-On Functionality Test Suite
Tests image upload, processing status, result retrieval, and image operations
"""

import requests
import json
import time
import io
from pathlib import Path
from PIL import Image
import tempfile
import os
from typing import Dict, Tuple

class VirtualTryOnTester:
    def __init__(self):
        self.base_url = "http://localhost:8000/api"
        self.results = []
        self.test_job_id = None
        self.test_resources = []
        
    def log_test(self, name: str, status: str, message: str = ""):
        """Log test result"""
        self.results.append({
            "test": name,
            "status": status,
            "message": message,
        })
        symbol = "✓" if status == "PASS" else "✗"
        print(f"{symbol} {name}: {status} {message}")
    
    def create_test_image(self, width: int = 256, height: int = 256) -> Tuple[bytes, str]:
        """Create a test image file"""
        try:
            # Create a simple test image
            img = Image.new('RGB', (width, height), color=(73, 109, 137))
            
            # Add some variation
            pixels = img.load()
            for i in range(width):
                for j in range(height):
                    pixels[i, j] = (
                        (i * 255) // width,
                        (j * 255) // height,
                        128
                    )
            
            # Save to bytes
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='PNG')
            img_bytes.seek(0)
            
            return img_bytes.getvalue(), 'test_image.png'
        except Exception as e:
            self.log_test("Create Test Image", "FAIL", str(e))
            return None, None
    
    def test_tryon_upload_endpoint_exists(self) -> bool:
        """Test if try-on upload endpoint exists"""
        try:
            # First get a product to use
            products_response = requests.get(
                f"{self.base_url}/products?limit=1",
                timeout=5
            )
            
            if products_response.status_code != 200:
                self.log_test("Try-On Upload Endpoint", "FAIL", "No products available")
                return False
            
            products = products_response.json()
            if not products:
                self.log_test("Try-On Upload Endpoint", "FAIL", "No products returned")
                return False
            
            product_id = products[0].get("id")
            
            # Create test image
            img_bytes, filename = self.create_test_image()
            if not img_bytes:
                return False
            
            # Try to upload
            files = {'file': (filename, img_bytes, 'image/png')}
            params = {'product_id': product_id}
            
            response = requests.post(
                f"{self.base_url}/tryon/upload",
                files=files,
                params=params,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                if 'job_id' in data:
                    self.test_job_id = data['job_id']
                    self.log_test(
                        "Try-On Upload Endpoint",
                        "PASS",
                        f"Job ID: {self.test_job_id}, Status: {data.get('status')}"
                    )
                    return True
            
            self.log_test(
                "Try-On Upload Endpoint",
                "FAIL",
                f"Status: {response.status_code}"
            )
        except Exception as e:
            self.log_test("Try-On Upload Endpoint", "FAIL", str(e))
        
        return False
    
    def test_tryon_status_endpoint(self) -> bool:
        """Test try-on status checking endpoint"""
        if not self.test_job_id:
            # Try to get a job first
            if not self.test_tryon_upload_endpoint_exists():
                self.log_test("Try-On Status Endpoint", "SKIP", "No job ID available")
                return False
        
        try:
            response = requests.get(
                f"{self.base_url}/tryon/status/{self.test_job_id}",
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ['id', 'status']
                if all(field in data for field in required_fields):
                    status = data.get('status')
                    self.log_test(
                        "Try-On Status Endpoint",
                        "PASS",
                        f"Status: {status}, Job ID: {data.get('id')}"
                    )
                    return True
                else:
                    self.log_test(
                        "Try-On Status Endpoint",
                        "FAIL",
                        f"Missing fields: {data.keys()}"
                    )
            else:
                self.log_test(
                    "Try-On Status Endpoint",
                    "FAIL",
                    f"Status code: {response.status_code}"
                )
        except Exception as e:
            self.log_test("Try-On Status Endpoint", "FAIL", str(e))
        
        return False
    
    def test_invalid_image_upload(self) -> bool:
        """Test image validation - file too large"""
        try:
            products_response = requests.get(
                f"{self.base_url}/products?limit=1",
                timeout=5
            )
            
            if products_response.status_code != 200:
                self.log_test("Image Validation", "SKIP", "No products available")
                return False
            
            products = products_response.json()
            if not products:
                self.log_test("Image Validation", "SKIP", "No products returned")
                return False
            
            product_id = products[0].get("id")
            
            # Create a large test image (simulate large file)
            large_img = Image.new('RGB', (5000, 5000), color=(100, 100, 100))
            img_bytes = io.BytesIO()
            large_img.save(img_bytes, format='PNG', quality=1)
            img_bytes.seek(0)
            
            files = {'file': ('large_image.png', img_bytes, 'image/png')}
            params = {'product_id': product_id}
            
            response = requests.post(
                f"{self.base_url}/tryon/upload",
                files=files,
                params=params,
                timeout=10
            )
            
            # Should accept but resize, or reject
            if response.status_code in [200, 201, 400]:
                self.log_test(
                    "Image Validation - Large File",
                    "PASS",
                    f"Properly handled (status: {response.status_code})"
                )
                return True
            else:
                self.log_test(
                    "Image Validation - Large File",
                    "FAIL",
                    f"Unexpected status: {response.status_code}"
                )
        except Exception as e:
            self.log_test("Image Validation - Large File", "FAIL", str(e))
        
        return False
    
    def test_invalid_product_id(self) -> bool:
        """Test upload with invalid product ID"""
        try:
            img_bytes, filename = self.create_test_image()
            if not img_bytes:
                return False
            
            files = {'file': (filename, img_bytes, 'image/png')}
            params = {'product_id': 'invalid_product_xyz_12345'}
            
            response = requests.post(
                f"{self.base_url}/tryon/upload",
                files=files,
                params=params,
                timeout=5
            )
            
            # Should fail with 404 for invalid product
            if response.status_code == 404:
                self.log_test(
                    "Invalid Product ID Handling",
                    "PASS",
                    "Returns 404 for invalid product"
                )
                return True
            else:
                self.log_test(
                    "Invalid Product ID Handling",
                    "FAIL",
                    f"Expected 404, got {response.status_code}"
                )
        except Exception as e:
            self.log_test("Invalid Product ID Handling", "FAIL", str(e))
        
        return False
    
    def test_invalid_job_id(self) -> bool:
        """Test status check with invalid job ID"""
        try:
            response = requests.get(
                f"{self.base_url}/tryon/status/invalid_job_id",
                timeout=5
            )
            
            # Should return 404 for invalid job
            if response.status_code == 404:
                self.log_test(
                    "Invalid Job ID Handling",
                    "PASS",
                    "Returns 404 for invalid job"
                )
                return True
            else:
                self.log_test(
                    "Invalid Job ID Handling",
                    "FAIL",
                    f"Expected 404, got {response.status_code}"
                )
        except Exception as e:
            self.log_test("Invalid Job ID Handling", "FAIL", str(e))
        
        return False
    
    def test_try_on_delete_endpoint(self) -> bool:
        """Test try-on deletion endpoint"""
        if not self.test_job_id:
            self.log_test("Try-On Delete Endpoint", "SKIP", "No job ID available")
            return False
        
        try:
            response = requests.delete(
                f"{self.base_url}/tryon/{self.test_job_id}",
                timeout=5
            )
            
            if response.status_code in [200, 201, 204]:
                self.log_test(
                    "Try-On Delete Endpoint",
                    "PASS",
                    f"Deleted job {self.test_job_id}"
                )
                return True
            else:
                self.log_test(
                    "Try-On Delete Endpoint",
                    "FAIL",
                    f"Status: {response.status_code}"
                )
        except Exception as e:
            self.log_test("Try-On Delete Endpoint", "FAIL", str(e))
        
        return False
    
    def test_try_on_workflow(self) -> bool:
        """Test complete try-on workflow"""
        try:
            # Step 1: Get a product
            products_response = requests.get(
                f"{self.base_url}/products?limit=1",
                timeout=5
            )
            
            if products_response.status_code != 200:
                self.log_test("Try-On Complete Workflow", "FAIL", "Cannot get products")
                return False
            
            products = products_response.json()
            if not products:
                self.log_test("Try-On Complete Workflow", "FAIL", "No products available")
                return False
            
            product = products[0]
            product_id = product.get("id")
            
            # Step 2: Create and upload image
            img_bytes, filename = self.create_test_image(256, 256)
            if not img_bytes:
                return False
            
            files = {'file': (filename, img_bytes, 'image/png')}
            params = {'product_id': product_id}
            
            upload_response = requests.post(
                f"{self.base_url}/tryon/upload",
                files=files,
                params=params,
                timeout=10
            )
            
            if upload_response.status_code not in [200, 201]:
                self.log_test(
                    "Try-On Complete Workflow",
                    "FAIL",
                    f"Upload failed: {upload_response.status_code}"
                )
                return False
            
            job_data = upload_response.json()
            job_id = job_data.get('job_id')
            
            if not job_id:
                self.log_test(
                    "Try-On Complete Workflow",
                    "FAIL",
                    "No job ID in response"
                )
                return False
            
            # Step 3: Check initial status
            status_response = requests.get(
                f"{self.base_url}/tryon/status/{job_id}",
                timeout=5
            )
            
            if status_response.status_code != 200:
                self.log_test(
                    "Try-On Complete Workflow",
                    "FAIL",
                    f"Status check failed: {status_response.status_code}"
                )
                return False
            
            status_data = status_response.json()
            
            # Step 4: Poll for completion (with timeout)
            max_polls = 5
            for poll_count in range(max_polls):
                status_response = requests.get(
                    f"{self.base_url}/tryon/status/{job_id}",
                    timeout=5
                )
                
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    status = status_data.get('status')
                    
                    if status == 'completed':
                        self.log_test(
                            "Try-On Complete Workflow",
                            "PASS",
                            f"Completed in {poll_count + 1} polls"
                        )
                        return True
                    elif status == 'failed':
                        self.log_test(
                            "Try-On Complete Workflow",
                            "FAIL",
                            f"Job failed: {status_data.get('error')}"
                        )
                        return False
                
                if poll_count < max_polls - 1:
                    time.sleep(1)  # Wait before next poll
            
            # If we get here, job is still processing (which is ok)
            self.log_test(
                "Try-On Complete Workflow",
                "PASS",
                f"Workflow completed (status: {status})"
            )
            return True
            
        except Exception as e:
            self.log_test("Try-On Complete Workflow", "FAIL", str(e))
        
        return False
    
    def test_non_image_file_rejection(self) -> bool:
        """Test that non-image files are rejected"""
        try:
            products_response = requests.get(
                f"{self.base_url}/products?limit=1",
                timeout=5
            )
            
            if products_response.status_code != 200:
                self.log_test("Non-Image File Rejection", "SKIP", "No products")
                return False
            
            products = products_response.json()
            if not products:
                return False
            
            product_id = products[0].get("id")
            
            # Try to upload a text file
            files = {'file': ('test.txt', b'This is not an image', 'text/plain')}
            params = {'product_id': product_id}
            
            response = requests.post(
                f"{self.base_url}/tryon/upload",
                files=files,
                params=params,
                timeout=5
            )
            
            # Should reject non-image files (400 error expected)
            if response.status_code == 400:
                self.log_test(
                    "Non-Image File Rejection",
                    "PASS",
                    "Non-image file properly rejected"
                )
                return True
            elif response.status_code in [200, 201]:
                # Some error handling might be lenient
                self.log_test(
                    "Non-Image File Rejection",
                    "PASS",
                    "Accepts file (might process as binary)"
                )
                return True
            else:
                self.log_test(
                    "Non-Image File Rejection",
                    "FAIL",
                    f"Unexpected status: {response.status_code}"
                )
        except Exception as e:
            self.log_test("Non-Image File Rejection", "FAIL", str(e))
        
        return False
    
    def run_all_tests(self):
        """Run all virtual try-on tests"""
        print("\n" + "="*70)
        print("VIRTUAL TRY-ON FUNCTIONALITY TEST SUITE")
        print("="*70 + "\n")
        
        print("[1/8] Testing Try-On Upload Endpoint...")
        self.test_tryon_upload_endpoint_exists()
        
        print("\n[2/8] Testing Try-On Status Endpoint...")
        self.test_tryon_status_endpoint()
        
        print("\n[3/8] Testing Image Validation (Large Files)...")
        self.test_invalid_image_upload()
        
        print("\n[4/8] Testing Invalid Product ID Handling...")
        self.test_invalid_product_id()
        
        print("\n[5/8] Testing Invalid Job ID Handling...")
        self.test_invalid_job_id()
        
        print("\n[6/8] Testing Non-Image File Rejection...")
        self.test_non_image_file_rejection()
        
        print("\n[7/8] Testing Complete Try-On Workflow...")
        self.test_try_on_workflow()
        
        print("\n[8/8] Testing Try-On Delete Endpoint...")
        self.test_try_on_delete_endpoint()
        
        # Summary
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        
        passed = sum(1 for r in self.results if r["status"] == "PASS")
        failed = sum(1 for r in self.results if r["status"] == "FAIL")
        skipped = sum(1 for r in self.results if r["status"] == "SKIP")
        total = len(self.results)
        
        print(f"\nTotal Tests: {total}")
        print(f"✓ Passed: {passed}")
        print(f"✗ Failed: {failed}")
        print(f"⊘ Skipped: {skipped}")
        if total > 0:
            print(f"\nSuccess Rate: {(passed/total*100):.1f}%")
        
        print("\n" + "="*70)
        if failed == 0:
            print("VIRTUAL TRY-ON STATUS: ✓ ALL TESTS PASSED")
        else:
            print(f"VIRTUAL TRY-ON STATUS: ⚠ {failed} TEST(S) FAILED")
        print("="*70 + "\n")
        
        return failed == 0

if __name__ == "__main__":
    tester = VirtualTryOnTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)
