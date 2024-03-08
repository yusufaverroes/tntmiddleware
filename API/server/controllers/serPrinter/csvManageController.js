// controller for managing the QR/csv files from software 
import fs from 'fs';
import multer from 'multer';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set no file size limit
const maxSize = Infinity;
const fileDir = '../../../../files/QRCSV'

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadFolder = path.join(__dirname, fileDir);
    cb(null, uploadFolder);
    }
    ,
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Preserve original filename
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: maxSize },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('File must be a CSV or XLSX'));
    }
  }
}).single('file');



const handleFileUpload = (req, res) => {
  upload(req, res, (err) => {
    if (err) {
       console.log(err)
      return res.status(500).send('File upload failed');
    }
    // File is uploaded and available as req.file
    res.send('File uploaded successfully');
  });
};
const fileExists = (req, res) => {
  const fileName = req.params.filename;
  const filePath = path.join(__dirname, `${fileDir+fileName}`);
    if (fs.existsSync(filePath)) {
       res.send({doesExist:true})
    }
    else {
        res.send({doesExist:false})
    }
};

const deleteFile = (req, res) => {
  const fileName = req.params.filename;
  const filePath = path.join(__dirname, `${fileDir+fileName}`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
      res.status(200).send({ message:"the file is deleted" });
  }
  res.status(404).send('File not found');
};

const getFile = (req, res) => {
  const fileName = req.params.filename;
  const filePath = path.join(__dirname, `${fileDir+fileName}`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
};

const getFileSize = (req, res) => {
  const fileName = req.params.filename;
  const filePath = path.join(__dirname, `${fileDir+fileName}`);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    res.send({file_size: stats.size });
  }
  res.status(404).send('File not found');
};

export default {
  handleFileUpload,
  fileExists,
  deleteFile,
  getFile,
  getFileSize
};