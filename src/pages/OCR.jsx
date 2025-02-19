import React, { useState } from 'react';
import { createWorker } from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';
import { Button, message, Upload, Radio, Progress, Card, Space, Typography } from 'antd';
import { UploadOutlined, CopyOutlined, ScanOutlined, FileTextOutlined, GlobalOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const OCR = () => {
    const [extractedText, setExtractedText] = useState('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [extractionMode, setExtractionMode] = useState('normal');
    const [language, setLanguage] = useState('vie+eng+chi_tra');

    const getLanguageConfig = () => {
        return {
            loadLanguage: language,
            initialize: language.replace('+', '-')
        };
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(extractedText);
            message.success('Text copied to clipboard');
        } catch (err) {
            message.error('Failed to copy text');
        }
    };

    const handleFile = async (file) => {
        setLoading(true);
        setProgress(0);
        setExtractedText('');
        
        try {
            if (file.type === 'application/pdf') {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const typedArray = new Uint8Array(e.target.result);
                    const pdf = await pdfjs.getDocument(typedArray).promise;
                    let fullText = '';
                    
                    if (extractionMode === 'normal') {
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map(item => item.str).join(' ');
                            fullText += pageText + '\n';
                            setProgress((i / pdf.numPages) * 100);
                        }
                    } else {
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const viewport = page.getViewport({ scale: 2.0 });
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            await page.render({ canvasContext: context, viewport }).promise;
                            
                            const worker = await createWorker();
                            const langConfig = getLanguageConfig();
                            await worker.loadLanguage(langConfig.loadLanguage);
                            await worker.initialize(langConfig.initialize);
                            const { data: { text } } = await worker.recognize(canvas);
                            await worker.terminate();
                            fullText += text + '\n';
                            setProgress((i / pdf.numPages) * 100);
                        }
                    }
                    setExtractedText(fullText);
                };
                reader.readAsArrayBuffer(file);
            } else if (file.type.startsWith('image/')) {
                setProgress(33);
                const worker = await createWorker({
                    logger: progress => {
                        if (progress.status === 'recognizing text') {
                            setProgress(33 + (progress.progress * 67));
                        }
                    }
                });
                const langConfig = getLanguageConfig();
                await worker.loadLanguage(langConfig.loadLanguage);
                await worker.initialize(langConfig.initialize);
                const { data: { text } } = await worker.recognize(file);
                await worker.terminate();
                setExtractedText(text);
            } else {
                message.error('Please upload PDF or image files only');
            }
        } catch (error) {
            console.error(error);
            message.error('Error processing file');
        }
        setLoading(false);
        setProgress(100);
    };

    const uploadProps = {
        beforeUpload: (file) => {
            handleFile(file);
            return false;
        },
        accept: '.pdf,image/*'
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    {/* Header Section */}
                    <div className="text-center mb-8">
                        <Title level={2} className="!mb-2">
                            <ScanOutlined className="mr-2" />
                            OCR & PDF Text Extractor
                        </Title>
                        <Text className="text-gray-500">
                            Extract text from PDFs and images with support for multiple languages
                        </Text>
                    </div>

                    {/* Controls Section */}
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        {/* Left Column - Mode Selection */}
                        <Card className="shadow-md hover:shadow-lg transition-shadow">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <FileTextOutlined className="text-blue-500" />
                                    <Text strong>Extraction Mode</Text>
                                </div>
                                <Radio.Group 
                                    value={extractionMode} 
                                    onChange={e => setExtractionMode(e.target.value)}
                                    optionType="button"
                                    buttonStyle="solid"
                                    className="w-full grid grid-cols-2 gap-2"
                                >
                                    <Radio.Button value="normal" className="text-center">
                                        Normal Extraction
                                    </Radio.Button>
                                    <Radio.Button value="ocr" className="text-center">
                                        OCR Mode
                                    </Radio.Button>
                                </Radio.Group>
                            </div>
                        </Card>

                        {/* Right Column - Language Selection */}
                        <Card className="shadow-md hover:shadow-lg transition-shadow">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <GlobalOutlined className="text-green-500" />
                                    <Text strong>Language Selection</Text>
                                </div>
                                <Radio.Group 
                                    value={language} 
                                    onChange={e => setLanguage(e.target.value)}
                                    optionType="button"
                                    buttonStyle="solid"
                                    className="w-full grid grid-cols-2 gap-2"
                                >
                                    <Radio.Button value="vie+eng+chi_tra" className="text-center">
                                        All Languages
                                    </Radio.Button>
                                    <Radio.Button value="vie" className="text-center">
                                        Vietnamese
                                    </Radio.Button>
                                    <Radio.Button value="chi_tra" className="text-center">
                                        Chinese
                                    </Radio.Button>
                                    <Radio.Button value="eng" className="text-center">
                                        English
                                    </Radio.Button>
                                </Radio.Group>
                            </div>
                        </Card>
                    </div>

                    {/* Upload Section */}
                    <div className="flex justify-center mb-8">
                        <Space size="large">
                            <Upload {...uploadProps}>
                                <Button 
                                    icon={<UploadOutlined />} 
                                    loading={loading} 
                                    type="primary"
                                    size="large"
                                    className="min-w-[200px]"
                                >
                                    Upload PDF or Image
                                </Button>
                            </Upload>
                            {extractedText && (
                                <Button 
                                    icon={<CopyOutlined />} 
                                    onClick={copyToClipboard}
                                    size="large"
                                    className="min-w-[150px]"
                                >
                                    Copy Text
                                </Button>
                            )}
                        </Space>
                    </div>

                    {/* Progress Bar */}
                    {loading && (
                        <div className="mb-8">
                            <Progress 
                                percent={Math.round(progress)} 
                                status="active"
                                strokeColor={{
                                    '0%': '#108ee9',
                                    '100%': '#87d068',
                                }}
                            />
                        </div>
                    )}
                    
                    {/* Results Section */}
                    {extractedText && (
                        <Card
                            title={
                                <div className="flex items-center gap-2">
                                    <FileTextOutlined className="text-blue-500" />
                                    <span>Extracted Text</span>
                                </div>
                            }
                            className="shadow-lg"
                        >
                            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg max-h-[500px] overflow-auto">
                                {extractedText}
                            </pre>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OCR;